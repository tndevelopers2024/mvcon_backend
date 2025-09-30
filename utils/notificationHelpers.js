const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper function to create admin notifications
exports.createAdminNotification = async (title, message, type, quotationId) => {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    
    // Create notifications for all admins
    const notificationPromises = adminUsers.map(admin => 
      Notification.create({
        user: admin._id,
        title,
        message,
        type,
        quotation: quotationId,
        isAdminNotification: true
      })
    );
    
    await Promise.all(notificationPromises);
  } catch (err) {
    console.error('Error creating admin notifications:', err);
    throw err; // Re-throw the error if you want calling functions to handle it
  }
};

// Add other notification-related helper functions here if needed