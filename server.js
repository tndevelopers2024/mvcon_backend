require('dotenv').config();
const express = require('express');
const http = require('http');
const fileUpload = require('express-fileupload');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const colors = require('colors');
const { Server } = require('socket.io');

// Custom modules
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const sanitizeInput = require('./middleware/sanitizeInput');

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const notificationRoutes = require('./routes/notificationRoutes');
const scanRoutes = require('./routes/scan');
const paymentRoutes=require('./routes/paymentRoutes');
const abstractRoutes = require("./routes/abstractRoutes");

// Connect to MongoDB
connectDB();

// Init express app
const app = express();

// Create HTTP server for WebSocket
const httpServer = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:9002',
      'http://localhost:3000',
      'http://localhost:5173',
      'https://convertscantocad.com',
      'https://api.convertscantocad.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // If using cookies/auth
  },
});

app.use(
  fileUpload({
    createParentPath: true, // auto create folder if not exists
  })
);

// Attach io to app
app.set('io', io);

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// ========== CORS Configuration ========== //
const allowedOrigins = [
  'http://localhost:9002',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://convertscantocad.com',
  'https://api.convertscantocad.com',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies/auth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(sanitizeInput);

// ✅ Helmet fixed (allow images + disable strict CSP)
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow images from other origins
    contentSecurityPolicy: false, // disable CSP (or configure if needed)
  })
);

app.use(hpp());

// Rate limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ Static file serving
// Profile images (can use normal caching)
app.use(
  '/uploads/profile',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, 'uploads/profile'))
);

// QR codes (disable caching, always return 200 OK)
app.use(
  '/uploads/qrcodes',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, 'uploads/qrcodes'), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    maxAge: 0,
  })
);

// Fallback for other uploads
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/scan', scanRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use("/api/v1/abstracts", abstractRoutes);

// Global error handler
app.use(errorHandler);

// Server listen
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`.red);
  httpServer.close(() => process.exit(1));
});
