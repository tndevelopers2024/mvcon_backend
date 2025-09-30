const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['quote_requested', 'quote_raised','quote_updated', 'quote_approved', 'quote_rejected','po_status_updated', 'quote_ongoing', 'quote_completed','files_updated', 'user_decision', 'user_decision_po', 'rejection_with_message', 'quotation_issue_reported','reported_files_uploaded'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
