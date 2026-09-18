const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');
const {
  getVendorAnalytics,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getOrders,
  getBookings,
  getApplications,
  updateOrderStatus,
  getOrderResume,
  getCustomers,
  createDeliveryPartner,
  getDeliveryPartners,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  updateProfile,
  getProfile,
  changePassword,
  forgotPasswordOTP,
  resetPasswordOTP,
  getPlatformConfigReadOnly,
  getPatients,
  updatePatientNotes,
  addPatientRecord,
  addBusiness,
  deleteBusiness,
  updateBusiness
} = require('../controllers/vendorController');

const { uploadToCloudinary } = require('../config/cloudinary');

// Multer Config for Product Images using Memory Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG/PNG/WEBP/GIF) are allowed'));
  }
});

const router = express.Router();

// Apply auth middleware to all vendor routes
router.use(protect);
router.use(authorize('Vendor'));

// Upload Endpoint using Cloudinary
router.post('/upload', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      // Multer errors (file size, file type, etc.)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Failed to upload image' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    try {
      const filenameHint = req.file.originalname || 'upload.jpg';
      const imageUrl = await uploadToCloudinary(req.file.buffer, 'product_images', filenameHint);
      return res.status(200).json({
        success: true,
        imageUrl: imageUrl
      });
    } catch (uploadErr) {
      console.error('Image Upload Error:', uploadErr);
      try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const ext = path.extname(req.file.originalname || '') || '.jpg';
        const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
        return res.status(200).json({
          success: true,
          imageUrl: `/uploads/${filename}`
        });
      } catch (localSaveErr) {
        return res.status(500).json({ success: false, message: 'Failed to save image' });
      }
    }
  });
});

// Analytics
router.get('/analytics', getVendorAnalytics);

// Product / Service Catalog CRUD
router.post('/products', createProduct);
router.get('/products', getProducts);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Orders / Bookings / Applications
router.get('/orders', getOrders);
router.get('/bookings', getBookings);
router.get('/applications', getApplications);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/orders/:id/resume', getOrderResume);

// Customers
router.get('/customers', getCustomers);

// Patients (Hospital Vendor Specific)
router.get('/patients', getPatients);
router.put('/patients/:id/notes', updatePatientNotes);
router.post('/patients/:id/records', addPatientRecord);

// Delivery Partners
router.post('/delivery-partners', createDeliveryPartner);
router.get('/delivery-partners', getDeliveryPartners);
router.put('/delivery-partners/:id', updateDeliveryPartner);
router.delete('/delivery-partners/:id', deleteDeliveryPartner);

// Profile Settings
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/forgot-password-otp', forgotPasswordOTP);
router.post('/reset-password-otp', resetPasswordOTP);
router.post('/business', addBusiness);
router.put('/business/:id', updateBusiness);
router.delete('/business/:id', deleteBusiness);
router.get('/commission-config', getPlatformConfigReadOnly);

// Settlement routes (Vendor)
const { getVendorSettlements } = require('../controllers/settlementController');
router.get('/settlements', getVendorSettlements);

const { createAppointment, createBooking, createManualOrder } = require('../controllers/appointmentController');
router.post('/appointments', createAppointment);
router.post('/bookings', createBooking);
router.post('/orders', createManualOrder);

module.exports = router;
