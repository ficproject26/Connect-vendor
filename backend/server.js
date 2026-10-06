const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Explicitly remove Express server fingerprinting header
app.disable('x-powered-by');

// ─── HELMET SECURITY HEADERS ──────────────────────────────────────────────────
app.use(
  helmet({
    // Content-Security-Policy (CSP) tailored for FIS Vendor Architecture
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: [
          "'self'",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
          "data:"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for dynamic styles (React inline styles / Tailwind CSS)
          "https://fonts.googleapis.com"
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Needed for inline scripts and external gateway integrations
          "https://checkout.razorpay.com"
        ],
        scriptSrcAttr: ["'none'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:", // Used for local preview of images/files before upload
          "https://res.cloudinary.com",
          "https://*.cloudinary.com"
        ],
        connectSrc: [
          "'self'",
          "http://localhost:*",
          "https://localhost:*",
          "ws://localhost:*",
          "wss://localhost:*",
          "http://127.0.0.1:*",
          "https://127.0.0.1:*",
          "ws://127.0.0.1:*",
          "wss://127.0.0.1:*",
          "https://connect-vendor.vercel.app",
          "https://*.vercel.app",
          "https://connect-vendor.onrender.com",
          "wss://connect-vendor.onrender.com",
          "https://*.onrender.com",
          "wss://*.onrender.com",
          "https://api.razorpay.com",
          "https://*.razorpay.com",
          "https://res.cloudinary.com"
        ],
        frameSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://checkout.razorpay.com"
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null
      }
    },
    // Cross-Origin-Resource-Policy: cross-origin so uploaded static assets can be rendered by frontend
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Cross-Origin-Opener-Policy: allow popups for Razorpay payment modals and auth
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Cross-Origin-Embedder-Policy: false prevents breaking external embeds (Cloudinary, QR codes)
    crossOriginEmbedderPolicy: false,
    // HSTS: Enabled in production over HTTPS only (365 days, includeSubDomains)
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        }
      : false,
    // X-Content-Type-Options: nosniff
    noSniff: true,
    // X-Frame-Options: SAMEORIGIN
    frameguard: { action: "sameorigin" },
    // Referrer-Policy: strict-origin-when-cross-origin
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // X-DNS-Prefetch-Control: off
    dnsPrefetchControl: { allow: false },
    // X-Download-Options: noopen
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies: none
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    // Origin-Agent-Cluster: ?1
    originAgentCluster: true
  })
);

// ─── CORS CONFIGURATION (EXPLICIT ALLOWLIST) ──────────────────────────────────
const allowedOrigins = [
  'https://connect-vendor.vercel.app',
  'https://connect-admin-96pc.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8002'
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server health checks)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isVercelPreview = /^https:\/\/connect-vendor([a-z0-9-]*)\.vercel\.app$/.test(origin);

    if (isExplicitlyAllowed || isVercelPreview) {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Origin not in allowlist: ${origin}`);
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-business-id', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📡 Incoming: ${req.method} ${req.url}`);
  next();
});

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const resumesDir = path.join(__dirname, 'uploads', 'resumes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads/resumes', express.static(resumesDir));
app.use('/uploads', express.static(uploadsDir));

// Smart fallback handler for candidate resumes if static file is missing from ephemeral disk
app.get('/uploads/resumes/:filename', async (req, res, next) => {
  try {
    const rawFilename = req.params.filename;
    let decodedFilename = rawFilename;
    try {
      decodedFilename = decodeURIComponent(rawFilename);
    } catch (e) {
      decodedFilename = rawFilename;
    }

    // Check disk variations
    const candidates = [
      path.join(resumesDir, rawFilename),
      path.join(resumesDir, decodedFilename),
      path.join(resumesDir, decodedFilename.replace(/\s+/g, ' ')),
      path.join(resumesDir, decodedFilename.replace(/\s+/g, '')),
      path.join(uploadsDir, rawFilename),
      path.join(uploadsDir, decodedFilename)
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        res.setHeader('Content-Type', 'application/pdf');
        return res.sendFile(path.resolve(cand));
      }
    }

    // Search order in MongoDB matching candidateResume or candidate name
    const { Order } = require('./models/Schemas');
    const sanitizedSearch = decodedFilename.replace(/\.pdf$/i, '').trim();
    const order = await Order.findOne({
      $or: [
        { candidateResume: new RegExp(sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { memberName: new RegExp(sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { candidateName: new RegExp(sanitizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      ]
    }).lean();

    if (order) {
      const { generateCandidateResumePdf } = require('./utils/pdfGenerator');
      const candidateName = order.candidateName || order.memberName || order.customer_name || 'Candidate';
      const pdfBuffer = generateCandidateResumePdf({
        candidateName,
        candidateEmail: order.candidateEmail || 'Not Provided',
        candidatePhone: order.candidatePhone || order.customer_phone || 'Not Provided',
        jobTitle: order.jobTitle || order.product_details || (order.items && order.items[0]?.name) || 'Job Role',
        candidateEducation: order.candidateEducation || 'Graduate',
        experience: order.experience || 'Fresher',
        jobLocation: order.jobLocation || 'Not Specified',
        applicationId: order.applicationId || order.order_number || order.id || String(order._id),
        applicationDate: order.applicationDate || order.created_at || order.createdAt || new Date().toISOString(),
        status: order.status || 'APPLICATION RECEIVED',
        filename: decodedFilename
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(decodedFilename)}"`);
      return res.send(pdfBuffer);
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const memberRoutes = require('./routes/memberRoutes');
const publicRoutes = require('./routes/publicRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const { realtimeManager } = require('./realtime/realtimeManager');
const http = require('http');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor/subscriptions', subscriptionRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/realtime', realtimeRoutes);

// Base API route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Vendor API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 8002;

// Connect to Database and start server
const startServer = async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    realtimeManager.init(server);

    server.listen(PORT, () => {
      console.log(`📡 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`⚡ Real-Time WebSocket & Event-Driven Engine active on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`👉 Free port ${PORT} by running: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err.message);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

