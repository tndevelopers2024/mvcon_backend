require("dotenv").config();
const express = require("express");
const http = require("http");
const fileUpload = require("express-fileupload");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const colors = require("colors");
const { Server } = require("socket.io");

// Custom modules
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const sanitizeInput = require("./middleware/sanitizeInput");


// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const notificationRoutes = require("./routes/notificationRoutes");
const scanRoutes = require("./routes/scan");
const paymentRoutes = require("./routes/paymentRoutes");
const abstractRoutes = require("./routes/abstractRoutes");
const adminRegistrationRoutes = require('./routes/adminRegistrationRoutes');

// DB
connectDB();

const app = express();

// Trust proxy (necessary for express-rate-limit behind Nginx/Cloudflare)
app.set("trust proxy", true);

const httpServer = http.createServer(app);

//
// ✅ SINGLE GLOBAL CORS (NO DUPLICATES EVER)
//
const cors = require("cors");

const allowedOrigins = [
  "https://mvcon.in",
  "https://www.mvcon.in",
  "https://mvcon.space",
  "https://www.mvcon.space",
  "http://localhost:3000",
  "http://localhost:5173"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Split potential multiple origins (sometimes sent by reverse proxies)
    const origins = origin.split(',').map(o => o.trim());
    const isAllowed = origins.some(o => allowedOrigins.includes(o));
    
    if (isAllowed) {
      // Return the first allowed origin if multiple were sent
      const primaryOrigin = origins.find(o => allowedOrigins.includes(o));
      callback(null, primaryOrigin);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization"
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Handle preflight for all routes
app.options("/:any", cors(corsOptions));
//
// ✅ SOCKET.IO (NO HTTP CORS HEADERS)
//
const io = new Server(httpServer, {
  transports: ["websocket"], // prevent HTTP polling CORS
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

//
// Middleware
//
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use(express.json({ limit: "2gb" }));
app.use(express.urlencoded({ extended: true, limit: "2gb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(sanitizeInput);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);

app.use(hpp());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
});
app.use(limiter);

//
// ✅ STATIC FILES (NO CORS HEADERS HERE)
//
app.use(
  "/uploads/profile",
  express.static(path.join(__dirname, "uploads/profile"))
);

app.use(
  "/uploads/qrcodes",
  express.static(path.join(__dirname, "uploads/qrcodes"), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    maxAge: 0,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//
// Routes
//
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/scan", scanRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/abstracts", abstractRoutes);
app.use('/api/v1/admin-registration', adminRegistrationRoutes);

app.use(errorHandler);

//
// Server
//
const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV} on ${PORT}`.yellow.bold
  );
});

process.on("unhandledRejection", (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`.red);
  httpServer.close(() => process.exit(1));
});