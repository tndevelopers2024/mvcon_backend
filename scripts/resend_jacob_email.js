const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const resendEmail = async () => {
  try {
    await connectDB();

    const email = 'abhijithchannagiri@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`User found: ${user.name} (${user.email})`);

    // 1. Regenerate Password
    const firstName = user.name.split(" ")[0].toLowerCase().replace(/\s/g, '');
    const randPassNum = Math.floor(1000 + Math.random() * 9000);
    const newRawPassword = `${firstName}@${randPassNum}`;

    user.password = newRawPassword; // Will be hashed by pre-save hook
    console.log(`🔑 New Password Generated: ${newRawPassword}`);

    // 2. Regenerate QR Code
    const qrContent = `USER_ID:${user._id.toString()}`;
    const qrDir = path.join(__dirname, "../uploads/qrcodes/");
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const qrFileName = `${user._id}-qrcode.png`;
    const qrFilePath = path.join(qrDir, qrFileName);

    await QRCode.toFile(qrFilePath, qrContent);
    console.log(`✅ QR Code Regenerated at: ${qrFilePath}`);

    // Update user record with new QR details (if changed)
    user.qrCodeContent = qrContent;
    user.qrCodeImage = `/uploads/qrcodes/${qrFileName}`;

    // This save will hash the password and update other fields
    await user.save();
    console.log(`💾 User record updated in DB`);

    // 3. Send Email
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

    const attachments = [];
    if (fs.existsSync(qrFilePath)) {
      attachments.push({
        filename: "qrcode.png",
        path: qrFilePath,
        cid: "qrcodeimg",
      });
    } else {
      console.warn("⚠️ QR Code file missing, sending email without attachment.");
    }

    await sendEmail({
      email: user.email,
      subject: "🎫 Your MVCon Registration is Confirmed (Credentials Updated)",
      message,
      attachments,
    });

    console.log("✅ Email sent successfully with NEW password and QR code");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

resendEmail();
