const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  registerVendor, 
  loginVendor, 
  registerMember, 
  loginMember,
  sendTermsEmail
} = require('../controllers/authController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|gif|pdf/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const allowedMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    const mimetypeOk = allowedMimetypes.includes(file.mimetype);
    if (extname && mimetypeOk) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG/PNG/WEBP) or PDFs are allowed'));
  }
});

const uploadFields = upload.fields([
  { name: 'businessLicense', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'businessImages', maxCount: 5 }
]);

// Auth Routes - wrap multer in error handler
router.post('/register-vendor', (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }
    next();
  });
}, registerVendor);
router.post('/login-vendor', loginVendor);
router.post('/register-member', registerMember);
router.post('/login-member', loginMember);
router.post('/send-terms-email', sendTermsEmail);

module.exports = router;
