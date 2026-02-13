
const Abstract = require("../models/Abstract");
const User = require("../models/User"); // import user model
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const sendEmail = require("../utils/sendEmail");

// @desc Submit Abstract
// @route POST /api/v1/abstracts
// @access Public
exports.submitAbstract = asyncHandler(async (req, res, next) => {
  const { name, registerNo, institute, contact, email } = req.body;

  if (!req.files || !req.files.file) {
    return next(new ErrorResponse("File upload is required", 400));
  }

  // ✅ Check if user with register number exists
  const registeredUser = await User.findOne({ registerNumber: registerNo });
  if (!registeredUser) {
    return next(new ErrorResponse("Invalid registration number. Please register first.", 400));
  }

  // ✅ Verify email also matches the registered user (extra security)
  if (registeredUser.email.toLowerCase() !== email.toLowerCase()) {
    return next(new ErrorResponse("Email does not match the registered registration number.", 400));
  }

  // ✅ File Upload
  const file = req.files.file;
  const uploadDir = path.join(__dirname, "../uploads/abstracts/");
  fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = Date.now() + "-" + file.name;
  const uploadPath = path.join(uploadDir, fileName);
  await file.mv(uploadPath);

  // ✅ Save in DB
  const abstract = await Abstract.create({
    name,
    registerNo,
    institute,
    contact,
    email,
    file: `/uploads/abstracts/${fileName}`,
  });

  // ✅ Send Email to Admin
  const adminEmail = process.env.ADMIN_EMAIL || "tndevelopmentworks@gmail.com" || "prasannakanthan@gmail.com";

  const message = `
    <div style="max-width:650px;margin:0 auto;padding:25px;
                font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
                background:#f9fafc;border-radius:12px;">
      
      <h2 style="color:#1f2937;font-size:22px;margin-bottom:15px;">📑 New Abstract Submission</h2>
      
      <table style="width:100%;border-collapse:collapse;font-size:15px;color:#374151;">
        <tr><td style="padding:8px 0;"><strong>Name:</strong></td><td>${name}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Register No:</strong></td><td>${registerNo}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Institute:</strong></td><td>${institute}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Contact:</strong></td><td>${contact}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Email:</strong></td><td>${email}</td></tr>
      </table>

      <p style="margin-top:20px;color:#6b7280;font-size:14px;">
        The abstract file is attached to this email for your review.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      email: adminEmail,
      subject: `New Abstract Submitted - ${name}`,
      message,
      attachments: [
        {
          filename: file.name,
          path: uploadPath,
        },
      ],
    });
  } catch (err) {
    console.error("❌ Failed to send email to admin:", err);
  }

  res.status(201).json({
    success: true,
    message: "Abstract submitted successfully",
    data: abstract,
  });
});



// @desc Get all abstracts (admin only)
// @route GET /api/v1/abstracts
exports.getAbstracts = asyncHandler(async (req, res) => {
  const abstracts = await Abstract.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: abstracts.length, data: abstracts });
});

// @desc Update abstract status (admin only)
// @route PUT /api/v1/abstracts/:id/status
exports.updateAbstractStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const abstract = await Abstract.findById(req.params.id);

  if (!abstract) {
    return next(new ErrorResponse("Abstract not found", 404));
  }

  abstract.status = status;
  await abstract.save();

  res.status(200).json({ success: true, data: abstract });
});

// @desc Delete abstract (admin only)
// @route DELETE /api/v1/abstracts/:id
exports.deleteAbstract = asyncHandler(async (req, res, next) => {
  const abstract = await Abstract.findById(req.params.id);

  if (!abstract) {
    return next(new ErrorResponse("Abstract not found", 404));
  }

  // Delete physical file
  const relativePath = abstract.file.startsWith("/") ? abstract.file.slice(1) : abstract.file;
  const filePath = path.join(__dirname, "..", relativePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await abstract.deleteOne();

  res.status(200).json({ success: true, data: {} });
});

// @desc Download all abstracts as ZIP (admin only)
// @route GET /api/v1/abstracts/download-all
exports.downloadAllAbstracts = asyncHandler(async (req, res, next) => {
  const abstracts = await Abstract.find();

  if (abstracts.length === 0) {
    return next(new ErrorResponse("No abstracts found to download", 404));
  }

  res.attachment("all_abstracts.zip");

  const archive = archiver("zip", {
    zlib: { level: 9 }, // Sets the compression level.
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(res);

  abstracts.forEach((abs) => {
    const relativePath = abs.file.startsWith("/") ? abs.file.slice(1) : abs.file;
    const filePath = path.join(__dirname, "..", relativePath);
    if (fs.existsSync(filePath)) {
      // Use name and register number for filename inside zip to make it distinct
      const extension = path.extname(filePath);
      const zipFileName = `${abs.name}_${abs.registerNo}${extension}`.replace(/[/\\?%*:|"<>]/g, '-');
      archive.file(filePath, { name: zipFileName });
    }
  });

  await archive.finalize();
});
