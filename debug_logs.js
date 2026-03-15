const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const UserLog = require('./models/UserLog');

dotenv.config();

const checkLogs = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const userId = '67d466f217820bb2069c9b91'; // Example ID from logs if possible
  const logs = await UserLog.find({ isValid: true }).sort({ timestamp: -1 }).limit(10);
  console.log('Recent Valid Logs:', JSON.stringify(logs, null, 2));
  process.exit();
};

checkLogs();
