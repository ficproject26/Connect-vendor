const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/auth');
const {
  getOnboardingStatus,
  getVendorAnalytics,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getOrders,
  getBookings,
  getOrderById,
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
  updateBusiness,
  getSalesPayments,
  getBusinessRequests,
  resubmitBusinessRequest,
  getProductSalesInsights,
  getCustomerPurchases,
  getVendorTickets,
  createVendorTicket,
  replyVendorTicket,
  updateTicketStatusForbidden,
  updateAcceptingOrders,
  getVendorRatings
} = require('../controllers/vendorController');

const { uploadToS3 } = require('../config/s3');

// Multer Config for Product/Document Uploads using Memory Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|avif|svg|pdf|doc|docx|xls|xlsx|csv|txt|webm|mp3|wav|m4a|ogg|aac/i;
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error(`File format '${file.mimetype || ext}' is not supported.`));
  }
});

const router = express.Router();

// Apply auth middleware to all vendor routes
router.use(protect);
router.use(authorize('Vendor'));

// Role-based Onboarding Status Endpoint (Requirement 5)
router.get('/onboarding-status', getOnboardingStatus);

// Upload Endpoint for Images, Documents, and Files to AWS S3
router.post('/upload', (req, res) => {
  upload.any()(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 25MB.' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Failed to upload file' });
    }
    const uploadedFile = (req.files && req.files.length > 0) ? req.files[0] : req.file;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    try {
      const filenameHint = uploadedFile.originalname || 'upload.jpg';
      const targetFolder = (req.body && req.body.folder) ? req.body.folder : 'product_images';
      const uploadRes = await uploadToS3(uploadedFile.buffer, targetFolder, filenameHint);
      const url = uploadRes.url || uploadRes.secure_url || String(uploadRes);
      return res.status(200).json({
        success: true,
        imageUrl: url,
        url: url,
        key: uploadRes.key || uploadRes.publicId,
        file: {
          name: filenameHint,
          url: url,
          key: uploadRes.key,
          size: uploadedFile.size
        }
      });
    } catch (uploadErr) {
      console.error('[Vendor S3 Upload Route Error]:', uploadErr.message);
      return res.status(500).json({ success: false, message: uploadErr.message || 'Failed to upload file to AWS S3' });
    }
  });
});

// Analytics
router.get('/analytics', getVendorAnalytics);

// Product / Service Catalog CRUD
router.post('/products', createProduct);
router.get('/products', getProducts);
router.get('/products/:id/sales-insights', getProductSalesInsights);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Orders / Bookings / Applications
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.get('/bookings', getBookings);
router.get('/bookings/:id', getOrderById);
router.get('/applications', getApplications);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/orders/:id/resume', getOrderResume);

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:customerId/purchases', getCustomerPurchases);

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
router.get('/business-requests', getBusinessRequests);
router.put('/business-requests/:id/resubmit', resubmitBusinessRequest);
router.get('/commission-config', getPlatformConfigReadOnly);

// Sales Payments Route (All categories)
router.get('/payments/sales', getSalesPayments);

// Vendor Accepting Orders & Ratings Routes
router.put('/accepting-orders', updateAcceptingOrders);
router.get('/ratings', getVendorRatings);

// Settlement routes (Vendor Admin Payments)
const { getVendorSettlements } = require('../controllers/settlementController');
router.get('/settlements', getVendorSettlements);

const { createAppointment, createBooking, createManualOrder } = require('../controllers/appointmentController');
router.post('/appointments', createAppointment);
router.post('/bookings', createBooking);
router.post('/orders', createManualOrder);

// Support Tickets Routes (Vendors can create and reply, but CANNOT change status)
router.get('/tickets', getVendorTickets);
router.post('/tickets', createVendorTicket);
router.post('/tickets/:id/reply', replyVendorTicket);
router.put('/tickets/:id/status', updateTicketStatusForbidden);

module.exports = router;
