const User = require("../models/User");
const UserLog = require("../models/UserLog");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateCertificate = require("../utils/generateCertificate");

// @desc    Scan QR Code and validate
// @route   POST /api/v1/scan
// @access  Private (admin/scanner)
exports.scanQRCode = asyncHandler(async (req, res, next) => {
  let { qrData } = req.body;

  if (!qrData) {
    return next(new ErrorResponse("QR data is required", 400));
  }

  if (qrData.startsWith("USER_ID:")) {
    qrData = qrData.replace("USER_ID:", "").trim();
  }

  let user = null;
  let isValid = false;
  let details = "";

  try {
    user = await User.findById(qrData);

    if (user) {
      isValid = true;
      details = `QR code verified for ${user.name}`;

      // ✅ Generate PDF & Image certificate if not already created
      if (!user.certificateFile || !user.certificateImage) {
        const certPaths = await generateCertificate(user);
        user.certificateFile = certPaths.pdf;
        user.certificateImage = certPaths.image;
        await user.save();
      }
    } else {
      details = "User not found for scanned QR";
    }
  } catch (err) {
    details = "Invalid QR code format";
  }

  await UserLog.create({
    user: user ? user._id : null,
    scannedBy: req.user.id,
    qrData,
    isValid,
    details,
  });

  res.status(200).json({
    success: true,
    isValid,
    user: isValid
      ? {
          id: user._id,
          name: user.name,
          email: user.email,
          designation: user.designation,
          city: user.city,
          profileImage: user.profileImage,
          qrCodeImage: user.qrCodeImage,
          certificateFile: user.certificateFile,
          certificateImage: user.certificateImage,
        }
      : null,
    message: details,
  });
});


// @desc    Get all scan logs
// @route   GET /api/v1/scan/logs
// @access  Private (admin)
exports.getAllLogs = asyncHandler(async (req, res, next) => {
  const logs = await UserLog.find()
    .populate("user", "name email designation city profileImage qrCodeImage")
    .populate("scannedBy", "name email role")
    .sort({ timestamp: -1 });

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});


// @desc    Get logs for a particular user
// @route   GET /api/v1/scan/logs/:userId
// @access  Private (admin or the user themself)
exports.getUserLogs = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // If user is not admin, they can only view their own logs
  if (req.user.role !== "admin" && req.user.id !== userId) {
    return next(new ErrorResponse("Not authorized to view these logs", 403));
  }

  const logs = await UserLog.find({ user: userId })
    .populate("user", "name email designation city profileImage qrCodeImage")
    .populate("scannedBy", "name email role")
    .sort({ timestamp: -1 });

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});
