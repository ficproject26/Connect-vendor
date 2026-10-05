const mongoose = require('mongoose');
const { getModel } = require('../config/db');

// --- USER & VENDOR SCHEMA ---
const UserSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.Mixed, default: () => new mongoose.Types.ObjectId() },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Vendor', 'Member'], required: true },
  status: { type: String, default: 'Pending' },
  
  // Vendor-specific fields
  vendorId: { type: String },
  registrationId: { type: String },
  vendorType: { type: String }, // e.g. Hospital, Restaurant, etc.
  category: { type: String },
  categoryId: { type: String },
  subcategory: { type: String },
  baseVendorType: { type: String },
  businessName: { type: String },
  agentName: { type: String },
  alternateVendorName: { type: String },
  contactPerson: { type: String },
  mobileNumber: { type: String },
  address: { type: String },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  postalCode: { type: String },
  telephone: { type: String },
  fax: { type: String },
  alternateNumber: { type: String },
  coPartnerName: { type: String },
  gstStatus: { type: String }, // GST Reg. or Non-GST Declared
  panNo: { type: String },
  aadhaarNo: { type: String },
  companyRegNo: { type: String },
  gstNumber: { type: String },
  msmeStatus: { type: String, default: 'Non-MSME' },
  businessLicense: { type: String }, // path/url to license image
  logo: { type: String },
  businessWebsite: { type: String },
  operatingHours: { type: String },
  businessImages: [{ type: String }],

  // Bank details fields
  accountHolderName: { type: String },
  bankName: { type: String },
  bankBranch: { type: String },
  bankStreet: { type: String },
  bankCity: { type: String },
  accountNo: { type: String },
  ifscCode: { type: String },
  swiftCode: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  businesses: [{
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    vendorType: { type: String },
    category: { type: String },
    subcategory: { type: String },
    baseVendorType: { type: String },
    businessName: { type: String },
    logo: { type: String },
    businessLicense: { type: String },
    businessImages: [{ type: String }],
    doorNo: { type: String },
    village: { type: String },
    taluk: { type: String },
    district: { type: String },
    state: { type: String },
    pincode: { type: String },
    address: { type: String },
    phone: { type: String },
    panNo: { type: String },
    panDoc: { type: String },
    aadhaarNo: { type: String },
    aadhaarDoc: { type: String },
    gstNumber: { type: String },
    gstDoc: { type: String },
    categoryDocuments: { type: mongoose.Schema.Types.Mixed, default: {} },
    assignedAdminId: { type: String },
    assignedAdminName: { type: String },
    assignedAdminRole: { type: String },
    assignedAdminPincode: { type: String },
    assignedAt: { type: Date },
    status: { type: String, default: 'Pending Pincode Admin Review' },
    rejectionReason: { type: String },
    changesRequiredReason: { type: String },
    isActive: { type: Boolean, default: false },
    auditTrail: [{
      previousStatus: { type: String },
      newStatus: { type: String },
      actor: { type: String },
      actorRole: { type: String },
      action: { type: String },
      reason: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  primaryBusinessId: { type: String }
}, { timestamps: true });

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ vendorId: 1 });
UserSchema.index({ "businesses._id": 1 });

// Helper to normalize _id queries so both String and ObjectId match seamlessly
const formatIdQuery = (val) => {
  if (!val) return val;
  if (typeof val === 'string') {
    if (mongoose.Types.ObjectId.isValid(val) && val.length === 24) {
      return { $in: [val, new mongoose.Types.ObjectId(val)] };
    }
    return val;
  }
  if (val instanceof mongoose.Types.ObjectId) {
    return { $in: [val.toString(), val] };
  }
  return val;
};

const normalizeIdFilter = function(next) {
  const filter = this.getFilter ? this.getFilter() : null;
  if (filter) {
    if (filter._id && !(filter._id.$in)) {
      filter._id = formatIdQuery(filter._id);
    }
    if (Array.isArray(filter.$or)) {
      filter.$or = filter.$or.map(cond => {
        if (cond && cond._id && !(cond._id.$in)) {
          return { ...cond, _id: formatIdQuery(cond._id) };
        }
        return cond;
      });
    }
  }
  if (typeof next === 'function') next();
};

UserSchema.pre('find', normalizeIdFilter);
UserSchema.pre('findOne', normalizeIdFilter);
UserSchema.pre('findOneAndUpdate', normalizeIdFilter);
UserSchema.pre('findOneAndDelete', normalizeIdFilter);
UserSchema.pre('findOneAndReplace', normalizeIdFilter);
UserSchema.pre('countDocuments', normalizeIdFilter);

// --- MEMBERSHIP PLAN SCHEMA ---
const MembershipPlanSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String, enum: ['Silver', 'Gold', 'Diamond'], required: true, unique: true },
  price: { type: Number, required: true },
  discountPercent: { type: Number, required: true },
  validityDays: { type: Number, required: true },
  benefits: [{ type: String }]
}, { timestamps: true });

// --- MEMBERSHIP CARD SCHEMA ---
const MembershipCardSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, required: true },
  membershipId: { type: String, required: true, unique: true },
  planName: { type: String, required: true },
  discountPercent: { type: Number, required: true },
  qrCode: { type: String, required: true }, // base64 QR image
  status: { type: String, enum: ['Active', 'Expired'], default: 'Active' },
  startDate: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  expiryWarningSent: { type: Boolean, default: false }
}, { timestamps: true });

MembershipCardSchema.index({ userId: 1 });

// --- MEMBERSHIP HISTORY SCHEMA ---
const MembershipHistorySchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Expired', 'Upgraded'], default: 'Active' }
}, { timestamps: true });

// --- PRODUCT / SERVICE CATALOG SCHEMA ---
// This schema is unified to accommodate Hospital doctors, Store products, Restaurant dishes, 
// Pharmacy medicines, Hotel rooms, Grocery products, Furniture, Electronics, and Services.
const ProductSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  vendorId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: { type: String },
  subcategory: { type: String },
  subNavbarCategory: { type: String },
  mainCategory: { type: String },
  unit: { type: String, default: 'count', enum: ['count', 'milligram', 'gram', 'kg', 'litre', 'ml', 'piece', 'dozen', 'pack', 'box'] },
  
  // Custom fields based on Vendor Type
  stock: { type: Number, default: 0 },         // Store, Grocery, Furniture, Electronics
  warranty: { type: String },                 // Electronics
  specialization: { type: String },           // Hospital (Doctor field)
  pinCode: { type: String },
  duration: { type: String },                 // Service Provider (Service duration)
  roomType: { type: String },                 // Hotel (Room standard/type)
  guests: { type: Number, default: 2 },       // Hotel room guest capacity
  amenities: { type: [String], default: [] }, // Selected amenities (Stay/Travel)
  imageUrl: { type: String },                 // Product Image
  imageUrls: { type: [String], default: [] }, // Multiple Product Images
  foodType: { type: String },                 // Restaurant (Veg / Non-Veg)
  bookingType: { type: String, enum: ['Slot booking', 'technician booking'], default: 'Slot booking' }, // Service booking type categories
  status: { type: String, default: 'Available' }, // e.g. Available, Out of Stock, Booked
  cardTypes: { type: [String], enum: ['Silver', 'Gold', 'Diamond'], default: ['Silver', 'Gold', 'Diamond'] },
  availableSizes: { type: [String], default: [] },   // Shoe & Clothing Sizes
  availableColors: { type: [String], default: [] },  // Shoe & Clothing Colors
  availableTimeSlots: { type: [String], default: [
    '09:00 AM - 09:30 AM',
    '09:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '11:00 AM - 11:30 AM',
    '11:30 AM - 12:00 PM',
    '12:00 PM - 12:30 PM',
    '12:30 PM - 01:00 PM',
    '02:00 PM - 02:30 PM',
    '02:30 PM - 03:00 PM',
    '03:00 PM - 03:30 PM',
    '03:30 PM - 04:00 PM',
    '04:00 PM - 04:30 PM',
    '04:30 PM - 05:00 PM'
  ] },
  jobType: { type: String },
  jobLocation: { type: String },
  experience: { type: String },
  skills: { type: String },
  deadline: { type: String },
  applicationTips: { type: String },
  qualification: { type: String },
  linkedProfile: { type: String },
  contactNumber: { type: String },
  mailId: { type: String },
  department: { type: String },

  // Travel / Bus Booking fields
  boardingPoint: { type: String }, // Legacy compatibility
  boardingTime: { type: String },  // Legacy compatibility
  dropPoint: { type: String },      // Legacy compatibility
  arrivalTime: { type: String },    // Legacy compatibility
  boardingPoints: [{
    id: { type: String },
    name: { type: String, required: true },
    departureTime: { type: String },
    time: { type: String },
    landmark: { type: String, default: '' },
    active: { type: Boolean, default: true }
  }],
  droppingPoints: [{
    id: { type: String },
    name: { type: String, required: true },
    arrivalTime: { type: String },
    time: { type: String },
    landmark: { type: String, default: '' },
    active: { type: Boolean, default: true }
  }],
  distance: { type: String },
  busTiming: { type: String },
  stoppings: [{
    stopName: { type: String },
    time: { type: String },
    distance: { type: String }
  }],
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, strict: false });

ProductSchema.index({ vendorId: 1, category: 1 });
ProductSchema.index({ vendor_id: 1 });
ProductSchema.index({ vendorId: 1, mainCategory: 1, createdAt: -1 });
ProductSchema.index({ vendorId: 1, type: 1, createdAt: -1 });
ProductSchema.index({ category: 1, subcategory: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ createdAt: -1 });

// --- ORDER / BOOKING SCHEMA ---
const OrderSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.Mixed, default: () => new mongoose.Types.ObjectId() },
  id: { type: String },
  order_number: { type: String },
  vendorId: { type: String, required: true },
  memberId: { type: String, required: true },
  memberName: { type: String, required: true },
  customerDisplayId: { type: String },
  type: { type: String, default: 'Order' },
  items: [{
    productId: { type: String },
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number }
  }],
  totalAmount: { type: Number, required: true },
  discountApplied: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  deliveryPartnerId: { type: String },
  candidateEmail: { type: String },
  candidateResume: { type: String },
  experience: { type: String },
  candidateEducation: { type: String },
  jobLocation: { type: String },
  
  // Custom fields based on Vendor Type
  appointmentDate: { type: String },         // Hospital
  appointmentTimeSlot: { type: String },     // Hospital (or other slot bookings)
  doctorName: { type: String },              // Hospital
  roomNumber: { type: String },              // Hotel
  tableNumber: { type: String },             // Restaurant
  prescriptionUrl: { type: String },         // Pharmacy

  // Travel booking fields
  travelDate: { type: String },
  journeyDate: { type: String },
  departureDate: { type: String },
  departureTime: { type: String },
  boardingPoint: { type: mongoose.Schema.Types.Mixed },
  droppingPoint: { type: mongoose.Schema.Types.Mixed },
  boardingPoints: [{ type: mongoose.Schema.Types.Mixed }],
  droppingPoints: [{ type: mongoose.Schema.Types.Mixed }],

  // Stay booking fields
  checkInDate: { type: String },
  checkOutDate: { type: String },
  checkInTime: { type: String },
  checkOutTime: { type: String },
  bookingDate: { type: String },
  bookingTime: { type: String },

  // Stock tracking
  stockReduced: { type: Boolean, default: false }
}, { timestamps: true, strict: false });

OrderSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ vendorId: 1, type: 1, createdAt: -1 });
OrderSchema.index({ vendor_id: 1, type: 1, createdAt: -1 });
OrderSchema.index({ type: 1, createdAt: -1 });
OrderSchema.index({ memberId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

OrderSchema.pre('save', function(next) {
  if (this.type === 'Job') {
    if (!this.order_number) {
      this.order_number = 'APP-' + new Date().getFullYear() + '-' + String(Math.floor(100000 + Math.random() * 900000));
    }
    if (!this.applicationId) {
      this.applicationId = this.order_number || this.id;
    }
    if (!this.id) {
      this.id = this.applicationId || this._id || new mongoose.Types.ObjectId().toString();
    }
    if (!this.status || this.status === 'Pending' || this.status === 'Order Received') {
      this.status = 'APPLICATION RECEIVED';
    }
  } else {
    if (!this.id) {
      this.id = this._id || new mongoose.Types.ObjectId().toString();
    }
    if (!this.order_number) {
      this.order_number = 'ORD' + Math.floor(100000 + Math.random() * 900000);
    }
  }
  next();
});

// --- DELIVERY PARTNER SCHEMA ---
// Note: Managed strictly by individual Vendors
const DeliveryPartnerSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  vendorId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ['Available', 'On Delivery', 'Offline'], default: 'Available' },
  vehicleNumber: { type: String },
  imageUrl: { type: String }
}, { timestamps: true, strict: false });

DeliveryPartnerSchema.index({ vendorId: 1, status: 1 });

// --- VENDOR CUSTOMERS SCHEMA ---
const CustomerSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  vendorId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  ordersCount: { type: Number, default: 1 },
  totalSpent: { type: Number, default: 0 }
}, { timestamps: true });

CustomerSchema.index({ vendorId: 1, createdAt: -1 });
CustomerSchema.index({ vendorId: 1, email: 1 });
CustomerSchema.index({ vendorId: 1, phone: 1 });

// --- PLATFORM CONFIG SCHEMA ---
const PlatformConfigSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  commissionRate: { type: Number, default: 0 },
  collectionMethod: { type: String, default: 'Admin Receives Full Payment' },
  deductionMethod: { type: String, default: 'Commission Deducted Before Settlement' },
  vendorPayout: { type: String, default: 'Remaining Balance Transferred to Vendor' },
  settlementCycle: { type: String, enum: ['Weekly', 'Monthly'], default: 'Weekly' }
}, { timestamps: true });

// --- SETTLEMENT SCHEMA ---
const SettlementSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  vendorId: { type: String, required: true },
  vendorBusinessName: { type: String },
  settlementDate: { type: Date, default: Date.now },
  grossAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  commissionDeducted: { type: Number, required: true },
  netAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Hold'], default: 'Pending' },
  category: { type: String },
  paymentType: { type: String, default: 'Direct Bank Settlement' },
  referenceId: { type: String },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  processingDate: { type: Date }
}, { timestamps: true, strict: false });

SettlementSchema.index({ vendorId: 1, settlementDate: -1 });

// --- PATIENT SCHEMA ---
const PatientSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  vendorId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'New'], default: 'Active' },
  
  // Personal Details
  gender: { type: String },
  age: { type: Number },
  dob: { type: String },
  address: { type: String },
  
  // Appointment aggregates
  totalAppointments: { type: Number, default: 0 },
  completedAppointments: { type: Number, default: 0 },
  upcomingAppointments: { type: Number, default: 0 },
  missedAppointments: { type: Number, default: 0 },
  
  // Payment aggregate & history
  consultationFees: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  paymentHistory: [{
    feeType: { type: String },
    amount: { type: Number },
    paymentDate: { type: String },
    paymentMethod: { type: String }
  }],
  
  // Membership details
  membershipType: { type: String, enum: ['Silver', 'Gold', 'Diamond'] },
  membershipId: { type: String },
  membershipStartDate: { type: String },
  membershipExpiryDate: { type: String },
  membershipBenefits: [{ type: String }],
  
  // Emergency Contact
  emergencyContact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String }
  },
  
  // Medical records
  medicalRecords: [{
    recordId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    type: { type: String }, // Prescription, Lab Report, Scan Report, Document
    title: { type: String },
    date: { type: String },
    doctorName: { type: String },
    fileName: { type: String },
    fileUrl: { type: String }
  }],
  
  // Notes
  hospitalNotes: { type: String },
  followUpReminders: { type: String },
  treatmentRemarks: { type: String },
  
  // Grid details
  totalVisits: { type: Number, default: 0 },
  totalFeesPaid: { type: Number, default: 0 },
  lastVisitDate: { type: String },
  upcomingAppointment: { type: String }, // e.g. "2026-06-25 10:00 AM"
  assignedDoctor: { type: String }
}, { timestamps: true });

PatientSchema.index({ vendorId: 1, createdAt: -1 });

// --- CATEGORY SCHEMA (Admin Category Management) ---
const CategorySchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String },
  mainCategory: { type: String },
  subcategory: { type: String },
  subSubcategory: { type: String },
  level: { type: String },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  children: [{ type: mongoose.Schema.Types.Mixed }]
}, { timestamps: true, strict: false });

// --- VENDOR SUBSCRIPTION SCHEMA ---
const SubscriptionSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  subscriptionId: { type: String, required: true, unique: true, index: true },
  vendorId: { type: String, required: true, index: true },
  vendorName: { type: String },
  businessId: { type: String, required: true, index: true },
  businessType: { type: String, required: true },
  businessName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { 
    type: String, 
    enum: ['Active', 'Expired', 'Pending', 'Payment Failed', 'Cancelled'], 
    default: 'Pending',
    index: true 
  },
  paymentStatus: { type: String, default: 'PENDING' },
  billingCycle: { type: String, default: 'Monthly' },
  startDate: { type: Date },
  endDate: { type: Date, index: true },
  nextDueDate: { type: Date },
  paymentDate: { type: Date },
  lastPaymentDate: { type: Date },
  paymentId: { type: String },
  latestPaymentId: { type: String },
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: { type: String },
  renewalCount: { type: Number, default: 0 },
  state: { type: String, index: true },
  district: { type: String, index: true },
  division: { type: String, index: true },
  pincode: { type: String, index: true },
  stateId: { type: String },
  districtId: { type: String },
  divisionId: { type: String },
  pincodeId: { type: String },
  approvedBy: { type: String },
  approvedByName: { type: String },
  approvedByRole: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, strict: false });

SubscriptionSchema.index({ vendorId: 1, businessId: 1 });
SubscriptionSchema.index({ vendorId: 1, status: 1 });
SubscriptionSchema.index({ vendorId: 1, endDate: 1 });

// --- VENDOR SUBSCRIPTION PAYMENT TRANSACTION SCHEMA ---
const SubscriptionPaymentSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  paymentId: { type: String, required: true, unique: true, index: true },
  vendorId: { type: String, required: true, index: true },
  vendorName: { type: String },
  businessId: { type: String, required: true, index: true },
  businessType: { type: String, required: true },
  businessName: { type: String, required: true },
  subscriptionId: { type: String, required: true, index: true },
  subscriptionType: { type: String, default: 'Monthly Subscription' },
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: { type: String, index: true },
  razorpaySignature: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String, default: 'Online' },
  paymentStatus: { 
    type: String, 
    enum: ['SUCCESS', 'FAILED', 'PENDING'], 
    default: 'PENDING',
    index: true 
  },
  paymentDate: { type: Date, default: Date.now, index: true },
  validFrom: { type: Date },
  validUntil: { type: Date },
  state: { type: String },
  district: { type: String },
  division: { type: String },
  pincode: { type: String },
  approvedBy: { type: String },
  failureReason: { type: String },
  rawResponse: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, strict: false });

SubscriptionPaymentSchema.index({ vendorId: 1, paymentDate: -1 });
SubscriptionPaymentSchema.index({ vendorId: 1, businessId: 1, paymentDate: -1 });
SubscriptionPaymentSchema.index({ vendorId: 1, paymentStatus: 1 });
SubscriptionPaymentSchema.index({ razorpayOrderId: 1, paymentStatus: 1 });

// --- VENDOR SUBSCRIPTION CONFIG SCHEMA ---
const SubscriptionConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'default_subscription_config' },
  defaultPrice: { type: Number, default: 1000 },
  currency: { type: String, default: 'INR' },
  periodMonths: { type: Number, default: 1 },
  categoryPricing: { type: Map, of: Number, default: {} },
  taxPercentage: { type: Number, default: 0 },
  razorpayKeyId: { type: String, default: '' },
  razorpayKeySecret: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// --- BUSINESS REGISTRATION / ONBOARDING REQUEST SCHEMA ---
const BusinessRequestSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  requestId: { type: String, index: true },
  vendorId: { type: String, required: true, index: true },
  vendorName: { type: String },
  vendorEmail: { type: String },
  vendorPhone: { type: String },
  businessId: { type: String, required: true, index: true },
  businessName: { type: String, required: true },
  businessCategory: { type: String, required: true },
  vendorType: { type: String },
  subcategory: { type: String },
  phone: { type: String },
  
  // Separate Address Fields
  doorNo: { type: String },
  village: { type: String },
  taluk: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String, required: true, index: true },
  address: { type: String },

  // Identity Details
  panNo: { type: String },
  panDoc: { type: String },
  aadhaarNo: { type: String },
  aadhaarDoc: { type: String },
  gstNumber: { type: String },
  gstDoc: { type: String },

  // Category Specific Documents
  categoryDocuments: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Territory / Pincode Admin Routing
  assignedAdminId: { type: String, index: true },
  assignedAdminName: { type: String },
  assignedAdminRole: { type: String },
  assignedAdminPincode: { type: String },
  assignedAt: { type: Date },

  // KYC Review Details
  kycReviewedBy: { type: String },
  kycReviewedByName: { type: String },
  kycReviewedAt: { type: Date },

  // Status
  status: {
    type: String,
    enum: [
      'Pending Pincode Admin Review',
      'Pincode Approved',
      'Pincode Rejected',
      'KYC Pending',
      'Under KYC Review',
      'KYC Approved',
      'KYC Rejected',
      'KYC Changes Required',
      'Active'
    ],
    default: 'Pending Pincode Admin Review',
    index: true
  },
  rejectionReason: { type: String },
  changesRequiredReason: { type: String },

  // Audit Trail
  auditTrail: [{
    previousStatus: { type: String },
    newStatus: { type: String },
    actor: { type: String },
    actorRole: { type: String },
    action: { type: String },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  submittedDate: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });

BusinessRequestSchema.index({ vendorId: 1, businessId: 1 });
BusinessRequestSchema.index({ pincode: 1, status: 1 });
BusinessRequestSchema.index({ assignedAdminId: 1, status: 1 });

// Compile and export models using the getModel wrapper
module.exports = {
  User: getModel('User', UserSchema),
  MembershipPlan: getModel('MembershipPlan', MembershipPlanSchema),
  MembershipCard: getModel('MembershipCard', MembershipCardSchema),
  MembershipHistory: getModel('MembershipHistory', MembershipHistorySchema),
  Product: getModel('Product', ProductSchema),
  Order: getModel('Order', OrderSchema),
  DeliveryPartner: getModel('DeliveryPartner', DeliveryPartnerSchema),
  Customer: getModel('Customer', CustomerSchema),
  PlatformConfig: getModel('PlatformConfig', PlatformConfigSchema),
  Settlement: getModel('Settlement', SettlementSchema),
  Patient: getModel('Patient', PatientSchema),
  Category: getModel('Category', CategorySchema),
  Subscription: getModel('Subscription', SubscriptionSchema),
  SubscriptionPayment: getModel('SubscriptionPayment', SubscriptionPaymentSchema),
  SubscriptionConfig: getModel('SubscriptionConfig', SubscriptionConfigSchema),
  BusinessRequest: getModel('BusinessRequest', BusinessRequestSchema)
};


