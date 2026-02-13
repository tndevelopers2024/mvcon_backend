const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../utils/asyncHandler");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const sendEmail = require('../utils/sendEmail');

// Init Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create Razorpay order
// @route   POST /api/v1/payments/create-order
// @access  Public
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { amount, currency } = req.body;

  const options = {
    amount: amount * 100, // convert to paise
    currency: currency || "INR",
    receipt: "rcpt_" + Date.now(),
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error(err);
    return next(new ErrorResponse("Error creating order", 500));
  }
});

// @desc    Verify Razorpay payment & create User
// @route   POST /api/v1/payments/verify
// @access  Public
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userData,
    amount,
  } = req.body;

  /* ======================================================
     ✅ VERIFY PAYMENT (ONLY IF PAID)
  ====================================================== */
  if (amount > 0) {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return next(new ErrorResponse("Payment verification failed", 400));
    }
  }

  /* ======================================================
     ✅ GENERATE REGISTER NUMBER
  ====================================================== */
  const randomPart = Math.floor(1000000000 + Math.random() * 9000000000); // 10-digit
  const regNum = `reg${Date.now()}${randomPart}`;

  /* ======================================================
     ✅ PRE-GENERATE USER ID
  ====================================================== */
  const tempUserId = new mongoose.Types.ObjectId();

  /* ======================================================
     ✅ QR CODE GENERATION
  ====================================================== */
  const qrContent = `USER_ID:${tempUserId.toString()}`;
  const qrDir = path.join(__dirname, "../uploads/qrcodes/");
  fs.mkdirSync(qrDir, { recursive: true });

  const qrFileName = `${tempUserId}-qrcode.png`;
  const qrFilePath = path.join(qrDir, qrFileName);
  await QRCode.toFile(qrFilePath, qrContent);

  /* ======================================================
     ✅ SAVE USER
  ====================================================== */
  const user = await User.create({
    _id: tempUserId,
    ...userData,
    registerNumber: regNum,
    qrCodeContent: qrContent,
    qrCodeImage: `/uploads/qrcodes/${qrFileName}`,
    isVerified: true,
    paymentInfo: {
      orderId: amount === 0 ? "FREE_REGISTRATION" : razorpay_order_id,
      paymentId: amount === 0 ? "FREE_PAYMENT" : razorpay_payment_id,
      signature: amount === 0 ? "FREE_SIGNATURE" : razorpay_signature,
      amount,
      status: amount === 0 ? "free" : "paid",
    },
  });

  /* ======================================================
     ✅ SEND EMAIL
  ====================================================== */
  try {
    const message = `
      <div style="max-width:650px;margin:0 auto;padding:25px;
                  font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
                  background:#f9fafc;border-radius:12px;">
        
        <div style="text-align:center;padding:20px 0;">
          <img src="https://www.mvcon.in/images/finalLogo.png" 
               alt="MVCon Logo" 
               style="max-width:120px;margin-bottom:15px;" />
          <h2 style="color:#1f2937;margin:0;font-size:26px;">🎉 Registration Confirmed</h2>
          <p style="color:#6b7280;margin:8px 0 0;font-size:15px;">
            Hi <strong>${user.name}</strong>, welcome to <b>MVCon2026</b>!
          </p>
        </div>

        <div style="background:#ffffff;margin:25px auto;
                    padding:25px;border-radius:12px;
                    box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          
          <h3 style="margin-top:0;color:#374151;font-size:20px;">
            Your Registration Details
          </h3>

          <p style="font-size:16px;color:#374151;margin:8px 0;">
            <strong>Register Number:</strong> ${user.registerNumber}
          </p>
          <p style="font-size:16px;color:#374151;margin:8px 0;">
            <strong>Email:</strong> ${user.email}
          </p>
          <p style="font-size:16px;color:#374151;margin:8px 0;">
            <strong>Password:</strong> ${userData.password}
          </p>

          <div style="text-align:center;margin:20px 0;">
            <p style="margin:0 0 10px;font-size:15px;color:#6b7280;">
              Show this QR code at the event
            </p>
            <img src="cid:qrcodeimg" alt="QR Code" 
                 style="max-width:200px;border:8px solid #f3f4f6;border-radius:12px;" />
          </div>
        </div>

        <div style="text-align:center;margin:30px 0;">
          <a href="https://www.mvcon.in/login" 
             style="display:inline-block;padding:12px 25px;
                    background:#5d01f2;color:#ffffff;text-decoration:none;
                    border-radius:8px;font-size:16px;font-weight:600;">
            Login to Your Account
          </a>
        </div>

        <div style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">
          <p style="margin:5px 0;">If you did not register, please ignore this email.</p>
          <p style="margin:5px 0;">&copy; ${new Date().getFullYear()} MVCon. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: "🎫 Your MVCon Registration is Confirmed",
      message,
      attachments: [
        {
          filename: "qrcode.png",
          path: qrFilePath,
          cid: "qrcodeimg",
        },
        {
          filename: "MVCon-Pass.png",
          path: qrFilePath,
          contentType: "image/png",
        },
      ],
    });

    console.log("✅ Email sent with QR code");
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }

  /* ======================================================
     ✅ FINAL RESPONSE
  ====================================================== */
  res.status(200).json({
    success: true,
    message: "Payment verified & user registered",
    data: {
      id: user._id,
      email: user.email,
      registerNumber: user.registerNumber,
      qrCodeImage: user.qrCodeImage,
    },
  });
});


