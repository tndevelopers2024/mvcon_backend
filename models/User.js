const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profession: {
    type: String,
    enum: ['PG', 'Delegates'],
    required: [true, 'Please select a profession'],
    trim: true,
    maxlength: [100, 'Profession name cannot be more than 100 characters']
  },
  city: {
    type: String,
    required: [true, 'Please select a city'],
    trim: true,
    maxlength: [100, 'City name cannot be more than 100 characters']
  },
  state: {
    type: String,
    required: [true, 'Please select a state'],
    trim: true,
    maxlength: [100, 'State name cannot be more than 100 characters']
  },
  designation: {
    type: String,
    required: [true, 'Please select a designation'],
    trim: true,
    maxlength: [100, 'Designation name cannot be more than 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    trim: true,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  profileImage: {
    type: String,
    default: ""
  },

  registerNumber: {
    type: String,
    unique: true,
    trim: true,
  },

  paymentInfo: {
    orderId: String,
    paymentId: String,
    signature: String,
    amount: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "free"],
      default: "pending",
    },
  },


  // 🔹 QR Code fields
  registrationDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  qrCodeContent: {
    type: String,
    required: true
  },
  qrCodeImage: {
    type: String,
    default: ""
  },

  certificateFile: {
    type: String,
    default: ""
  },
  certificateImage: {
    type: String,
    default: ""
  },
  medicalCouncilNumber: {
    type: String,
    trim: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Auto-update timestamp
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
