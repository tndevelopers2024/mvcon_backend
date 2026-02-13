const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`\x1b[32mMongoDB Connected: ${conn.connection.host}\x1b[0m`);
    } catch (error) {
        console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
        process.exit(1);
    }
};

const sendBulkReminder = async (dryRun = true, testEmail = null) => {
    const BACKEND_URL = 'https://mvcon.space';

    try {
        await connectDB();

        // Query based on testEmail or standard registered users
        const query = testEmail
            ? { email: testEmail }
            : { 'paymentInfo.status': { $in: ['paid', 'free'] } };

        const users = await User.find(query);

        console.log(`\n\x1b[36mTotal Registered Users Found: ${users.length}\x1b[0m`);

        if (dryRun) {
            console.log('\x1b[33m[DRY RUN MODE] - No emails will be sent and DB won\'t be updated.\x1b[0m');
        }

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            // 1. Regenerate Password (Raw)
            const firstName = user.name.split(" ")[0].toLowerCase().replace(/\s/g, '');
            const randPassNum = Math.floor(1000 + Math.random() * 9000);
            const newRawPassword = `${firstName}@${randPassNum}`;

            // Resolve QR Code URL (LIVE BACKEND URL)
            const qrImageUrl = user.qrCodeImage ? `${BACKEND_URL}${user.qrCodeImage}` : null;

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
                            Hi <strong>${user.name}</strong>, welcome to <b>MVCON2026</b>!
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
                        <p style="font-size:14px;color:#ef4444;margin:4px 0 12px;font-style:italic;">
                            * Please use this new password to login to your dashboard.
                        </p>

                        <div style="text-align:center;margin:20px 0;">
                            <p style="margin:0 0 10px;font-size:15px;color:#6b7280;">
                                Please display the QR code below at the venue to confirm your entry and mark your attendance
                            </p>
                            ${qrImageUrl
                    ? `<img src="${qrImageUrl}" alt="QR Code" style="max-width:200px;border:8px solid #f3f4f6;border-radius:12px;" />`
                    : `<p style="color:red;">[QR Code not found - Please login to your portal]</p>`
                }
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

            if (dryRun) {
                console.log(`- [DRY] Would send to: ${user.name} (${user.email}) | New Pass: ${newRawPassword} | QR URL: ${qrImageUrl}`);
                successCount++;
            } else {
                try {
                    // Update Database with new password
                    user.password = newRawPassword; // Will be hashed by User model pre-save hook
                    await user.save();
                    console.log(`💾 Updated password in DB for: ${user.email}`);

                    await sendEmail({
                        email: user.email,
                        subject: "🎫 Your MVCon Registration is Confirmed (Credentials Updated)",
                        message
                    });
                    console.log(`\x1b[32m✅ Sent to: ${user.name} (${user.email})\x1b[0m`);
                    successCount++;

                    // Small delay to avoid hitting rate limits
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    console.error(`\x1b[31m❌ Failed for: ${user.name} (${user.email}) - ${err.message}\x1b[0m`);
                    failCount++;
                }
            }
        }

        console.log(`\n\x1b[36m--- Summary ---\x1b[0m`);
        console.log(`Total processed: ${users.length}`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log(`\x1b[36m---------------\x1b[0m`);

        process.exit(0);
    } catch (err) {
        console.error(`\x1b[31mCritical Error: ${err.message}\x1b[0m`);
        process.exit(1);
    }
};

// Check for command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--send');
const testEmailIndex = args.indexOf('--test');
const testEmail = testEmailIndex !== -1 ? args[testEmailIndex + 1] : null;

sendBulkReminder(isDryRun, testEmail);
