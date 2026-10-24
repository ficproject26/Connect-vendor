const rateLimit = require('express-rate-limit');

// General API Rate Limiter: 1500 requests per 15 minutes per IP
// Accommodates modern SPA real-time dashboard operations, multi-tab polling, and shared NAT IPs.
// Crucially skips auth endpoints (protected by dedicated authLimiter), static uploads, and health checks.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    // Dedicated authLimiter protects /api/auth routes; do not consume general API quota
    if (url.includes('/api/auth')) return true;
    // Skip static uploads and media streaming
    if (url.includes('/api/uploads') || url.includes('/api/media')) return true;
    // Skip public and system health check endpoints
    if (url.includes('/health')) return true;
    return false;
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Authentication Limiter (Login, Register): 30 failed attempts per 15 minutes per IP
// Strictly guards against credential stuffing and brute-force password guessing.
// Legitimate successful logins (HTTP < 400) do NOT consume quota, preventing lockout of valid users.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true, // Only count failed attempts towards lockout
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  }
});

// Strict OTP Limiter: 5 attempts per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    message: 'Too many OTP requests from this IP, please try again after 15 minutes.'
  }
});

// Strict Email Limiter: 5 attempts per 15 minutes per IP
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    message: 'Too many email requests from this IP, please try again after 15 minutes.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  otpLimiter,
  emailLimiter
};
