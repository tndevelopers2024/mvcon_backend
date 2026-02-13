const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Resend registration email (with new password)
// @route   POST /api/v1/users/:id/resend-email
// @access  Private/Admin
exports.resendRegistrationEmail = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  console.log(`📧 Attempting to resend email for user: ${user.email} (${user._id})`);

  // 1. Regenerate Password
  const firstName = user.name.split(" ")[0].toLowerCase().replace(/\s/g, '');
  const randPassNum = Math.floor(1000 + Math.random() * 9000);
  const newRawPassword = `${firstName}@${randPassNum}`;

  user.password = newRawPassword; // Will be hashed by pre-save hook
  console.log(`🔑 New password generated: ${newRawPassword}`);

  // 2. Ensure QR Code exists (or regenerate)
  const qrDir = path.join(__dirname, "../uploads/qrcodes/");
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const qrFileName = `${user._id}-qrcode.png`;
  const qrFilePath = path.join(qrDir, qrFileName);

  if (!fs.existsSync(qrFilePath)) {
    console.log(`📸 Regenerating missing QR code...`);
    const qrContent = `USER_ID:${user._id.toString()}`;
    await QRCode.toFile(qrFilePath, qrContent);
    user.qrCodeContent = qrContent;
    user.qrCodeImage = `/uploads/qrcodes/${qrFileName}`;
  }

  await user.save();
  console.log(`💾 User record updated in database.`);

  // 3. Send Email
  console.log(`📤 Sending email via SMTP...`);
  try {
    const message = `
      <div style="max-width:650px;margin:0 auto;padding:25px;
                  font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
                  background:#f9fafc;border-radius:12px;">
        
        <div style="text-align:center;padding:20px 0;">
          <img src="https://www.mvcon.in/images/finalLogo.png" 
               alt="MVCon Logo" 
               style="max-width:120px;margin-bottom:15px;" />
          <h2 style="color:#1f2937;margin:0;font-size:26px;">🎉 Registration Details Resent</h2>
          <p style="color:#6b7280;margin:8px 0 0;font-size:15px;">
            Hi <strong>${user.name}</strong>, these are your updated registration details for <b>MVCon</b>!
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
            <strong>New Password:</strong> ${newRawPassword}
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
      subject: "🎫 Your MVCon Registration is Confirmed (Details Resent)",
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
    console.log(`✅ Email sent successfully to ${user.email}`);
  } catch (error) {
    console.error(`❌ SMTP Error: Failed to send email to ${user.email}`);
    console.error(error);
    return next(new ErrorResponse("Failed to send email. Please check server logs.", 500));
  }

  res.status(200).json({
    success: true,
    message: "Email resent successfully with new credentials"
  });
});
