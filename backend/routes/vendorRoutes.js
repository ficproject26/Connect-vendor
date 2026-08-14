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
  updateOrderStatus,
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
  deleteBusiness
} = require('../controllers/vendorController');

const { uploadToCloudinary } = require('../config/cloudinary');

// Multer Config for Product Images using Memory Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
        return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Failed to upload image' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    try {
      const filenameHint = req.file.originalname || 'upload.jpg';
      const imageUrl = await uploadToCloudinary(req.file.buffer, 'product_images', filenameHint);
      res.status(200).json({
        success: true,
        imageUrl: imageUrl
      });
    } catch (uploadErr) {
      console.error('Image Upload Error:', uploadErr);
      res.status(500).json({ success: false, message: 'Failed to process image upload' });
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

// Orders / Bookings
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);

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
