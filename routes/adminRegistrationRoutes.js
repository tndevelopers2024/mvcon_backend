const express = require('express');
const { registerByAdmin } = require('../controllers/adminRegistrationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protect and authorize('admin') to all routes in this file
router.use(protect);
router.use(authorize('admin'));

router.post('/', registerByAdmin);

module.exports = router;
