const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

const sendEmail = require('../utils/sendEmail');

// @desc    Admin Register User (no email, optional QR)
// @route   POST /api/v1/admin-registration
// @access  Private/Admin
exports.registerByAdmin = asyncHandler(async (req, res, next) => {
  const { name, email, phone, profession, city, state, designation, medicalCouncilNumber, generateQR } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse("User already exists", 400));
  }

  // Generate password
  const firstName = name.split(" ")[0].toLowerCase().replace(/\s/g, '');
  const randPassNum = Math.floor(1000 + Math.random() * 9000);
  const rawPassword = `${firstName}@${randPassNum}`;

  // Generate register number
  const randomPart = Math.floor(1000000000 + Math.random() * 9000000000);
  const regNum = `reg${Date.now()}${randomPart}`;

  // Pre-generate User ID
  const tempUserId = new mongoose.Types.ObjectId();

  let qrCodeContent = "";
  let qrCodeImage = "";
  let qrFilePath = "";

  // ⚡ Conditionally generate QR Code
  if (generateQR === true || generateQR === 'true') {
    qrCodeContent = `USER_ID:${tempUserId.toString()}`;
    const qrDir = path.join(__dirname, "../uploads/qrcodes/");
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const qrFileName = `${tempUserId}-qrcode.png`;
    qrFilePath = path.join(qrDir, qrFileName);
    await QRCode.toFile(qrFilePath, qrCodeContent);
    qrCodeImage = `/uploads/qrcodes/${qrFileName}`;
  }

  // Create User
  const user = await User.create({
    _id: tempUserId,
    name,
    email,
    phone,
    profession,
    city,
    state,
    designation,
    medicalCouncilNumber,
    password: rawPassword,
    role: "user",
    registerNumber: regNum,
    qrCodeContent: qrCodeContent || "N/A", // Required by schema if strict, though we'll update schema if needed
    qrCodeImage,
    isVerified: true,
    registeredByAdmin: true,
    paymentInfo: {
      orderId: "ADMIN_REGISTRATION",
      paymentId: "ADMIN_PAYMENT",
      signature: "ADMIN_SIGNATURE",
      amount: 0,
      status: "free",
    },
  });

  // 📧 Send Email Notification
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
          <strong>Password:</strong> ${rawPassword}
        </p>

        ${user.qrCodeImage ? `
        <div style="text-align:center;margin:20px 0;">
          <p style="margin:0 0 10px;font-size:15px;color:#6b7280;">
            Show this QR code at the event
          </p>
          <img src="cid:qrcodeimg" alt="QR Code" 
               style="max-width:200px;border:8px solid #f3f4f6;border-radius:12px;" />
        </div>` : ''}
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

  const attachments = [];
  if (qrFilePath && fs.existsSync(qrFilePath)) {
    attachments.push({
      filename: "qrcode.png",
      path: qrFilePath,
      cid: "qrcodeimg",
    });
  }

  try {
    await sendEmail({
      email: user.email,
      subject: "🎫 Your MVCon Registration is Confirmed",
      message,
      attachments,
    });
  } catch (err) {
    console.error("❌ Admin Registration Email failed:", err.message);
  }

  res.status(201).json({
    success: true,
    message: "User registered by admin successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      profession: user.profession,
      designation: user.designation,
      city: user.city,
      registerNumber: user.registerNumber,
      qrCodeImage: user.qrCodeImage,
      registeredByAdmin: user.registeredByAdmin,
    },
  });
});
