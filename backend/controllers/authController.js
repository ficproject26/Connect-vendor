const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode');
const { User, MembershipPlan, MembershipCard } = require('../models/Schemas');
const { uploadToCloudinary } = require('../config/cloudinary');
const {
  normalizeName,
  validateName,
  normalizeEmail,
  validateEmail,
  normalizeIndianMobile,
  validateIndianMobile,
  validatePassword,
  normalizeAadhaar,
  validateAadhaar,
  normalizePAN,
  validatePAN,
  normalizeAccountNumber,
  validateAccountNumber,
  normalizeIFSC,
  validateIFSC,
  validateDOB
} = require('../utils/validation');

// Helper function to generate JWT with scoped claims
const generateToken = (id, email, extraClaims = {}) => {
  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'super_secret_jwt_key_9999' : null);
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured on production server');
  }
  const isPendingOnboarding = extraClaims.tokenType === 'onboarding';
  return jwt.sign(
    { 
      id: id ? id.toString() : id,
      ...(email ? { email: String(email).toLowerCase().trim() } : {}),
      ...extraClaims
    },
    jwtSecret,
    { expiresIn: isPendingOnboarding ? '1d' : '30d' }
  );
};

const getBaseVendorType = (vendorType, category, subcategory) => {
  if (!vendorType) return "Store Vendor";
  
  const type = vendorType.split(':')[0].trim();
  const cat = category || "";
  const subcat = subcategory || "";
  
  // 1. Healthcare / Pharmacies handling
  if (subcat === "Pharmacies" || subcat === "Pharmacy" || cat === "Pharmacy & Healthcare") {
    return "Pharmacy Vendor";
  }
  if (cat === "Healthcare Services" || subcat === "Hospitals" || subcat === "Clinics" || subcat === "Dental Care" || subcat === "Eye Care" || subcat === "Telemedicine") {
    if (subcat === "Pharmacies") return "Pharmacy Vendor";
    if (["Hospitals", "Clinics", "Dental Care", "Eye Care", "Telemedicine"].includes(subcat)) {
      return "Hospital Vendor";
    }
    // Other healthcare services that are booking-based (e.g. Physiotherapy, Home Nursing, Ambulance) are Service Providers
    if (["Ambulance Services", "Home Nursing", "Physiotherapy", "Health Checkups", "Medical Equipment", "Diagnostic Centers"].includes(subcat)) {
      return "Service Provider Vendor";
    }
    return "Hospital Vendor"; // default fallback for Healthcare Services
  }

  // 2. Education
  if (cat === "Education Services" || type === "Education") {
    return "Education Vendor";
  }

  // 3. Jobs
  if (type === "Jobs" || cat === "Jobs") {
    return "Job Vendor";
  }

  // 4. Food / Restaurant
  if (type === "Food" || cat === "Food") {
    return "Restaurant Vendor";
  }

  // 5. Stay / Hotel
  if (type === "Stay" || cat === "Stay") {
    return "Hotel Vendor";
  }

  // 6. Travel / Services fallback
  if (type === "Travel" || type === "Services") {
    return "Service Provider Vendor";
  }

  // 7. Products
  if (type === "Products" || type === "Daily Needs") {
    if (cat === "Electronics" || cat === "IT & Office Equipment" || cat === "Home Appliances" || subcat.includes("Electronics")) {
      return "Electronics Vendor";
    }
    if (cat === "Furniture" || subcat.includes("Furniture")) {
      return "Home & Furniture Vendor";
    }
    if (type === "Daily Needs") {
      return "Grocery Vendor";
    }
    return "Store Vendor";
  }

  if (type === "Membership") {
    return "Store Vendor";
  }
  
  return vendorType;
};

// @desc    Register a new Vendor
// @route   POST /api/auth/register-vendor
// @access  Public
const registerVendor = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      vendorType, 
      category,
      categoryId,
      subcategory,
      businessName, 
      agentName,
      alternateVendorName,
      contactPerson,
      address,
      street,
      city,
      state,
      country,
      postalCode,
      telephone,
      fax,
      mobileNumber,
      gstStatus,
      panNo,
      aadhaarNo,
      companyRegNo,
      msmeStatus,
      accountHolderName,
      bankName,
      bankBranch,
      bankStreet,
      bankCity,
      accountNo,
      ifscCode,
      swiftCode,
      alternateNumber,
      coPartnerName,
      businessWebsite,
      operatingHours
    } = req.body;

    // Validate mandatory fields
    if (
      !email || 
      !password || 
      !vendorType || 
      !category ||
      !subcategory ||
      !businessName || 
      !contactPerson || 
      !address || 
      !mobileNumber || 
      !gstStatus || 
      !panNo || 
      !msmeStatus ||
      !accountHolderName ||
      !accountNo ||
      !ifscCode
    ) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields (*)' });
    }

    // 1. Name validation (Auto-capitalize first letter of each word, valid chars, length check)
    const contactPersonErr = validateName(contactPerson, 'Owner / Contact Person Name');
    if (contactPersonErr) return res.status(400).json({ success: false, message: contactPersonErr });

    const businessNameErr = validateName(businessName, 'Vendor / Business Name', { minLength: 2, maxLength: 100 });
    if (businessNameErr) return res.status(400).json({ success: false, message: businessNameErr });

    if (agentName) {
      const agentErr = validateName(agentName, 'Agent Name', { required: false });
      if (agentErr) return res.status(400).json({ success: false, message: agentErr });
    }

    if (coPartnerName) {
      const coPartnerErr = validateName(coPartnerName, 'Co-partner Name', { required: false });
      if (coPartnerErr) return res.status(400).json({ success: false, message: coPartnerErr });
    }

    const holderNameErr = validateName(accountHolderName, 'Account Holder Name');
    if (holderNameErr) return res.status(400).json({ success: false, message: holderNameErr });

    // 2. Email validation (RFC standard, exactly one @, valid domain & extension)
    const emailErr = validateEmail(email, 'Email Address');
    if (emailErr) return res.status(400).json({ success: false, message: emailErr });

    // 3. Indian Mobile Number validation (exactly 10 digits starting with 6, 7, 8, 9)
    const mobileErr = validateIndianMobile(mobileNumber, 'Mobile Number');
    if (mobileErr) return res.status(400).json({ success: false, message: mobileErr });

    if (alternateNumber) {
      const altErr = validateIndianMobile(alternateNumber, 'Alternate Mobile Number', false);
      if (altErr) return res.status(400).json({ success: false, message: altErr });
    }

    // 4. Password validation (min 6 chars, uppercase, digit, special character)
    const passwordErr = validatePassword(password, 'Account Password');
    if (passwordErr) return res.status(400).json({ success: false, message: passwordErr });

    // 5. Aadhaar Number validation (exactly 12 digits, format validation)
    if (aadhaarNo) {
      const aadhaarErr = validateAadhaar(aadhaarNo, 'Aadhaar Number', false);
      if (aadhaarErr) return res.status(400).json({ success: false, message: aadhaarErr });
    }

    // 6. PAN Card validation (5 uppercase letters, 4 digits, 1 uppercase letter)
    const panErr = validatePAN(panNo, 'PAN Number');
    if (panErr) return res.status(400).json({ success: false, message: panErr });

    // 7. Bank Account Number validation (documented bank rules or safe 9-18 digit length)
    const accErr = validateAccountNumber(accountNo, bankName, 'Account Number');
    if (accErr) return res.status(400).json({ success: false, message: accErr });

    // 8. IFSC Code validation (11 chars, 5th char 0, alphanumeric)
    const ifscErr = validateIFSC(ifscCode, 'IFSC Code');
    if (ifscErr) return res.status(400).json({ success: false, message: ifscErr });

    // 9. Date of Birth and Minimum Age (minimum 18 years calculation)
    if (req.body.dob || req.body.dateOfBirth) {
      const dobErr = validateDOB(req.body.dob || req.body.dateOfBirth, 18, 'Date of Birth');
      if (dobErr) return res.status(400).json({ success: false, message: dobErr });
    }

    // Normalized values
    const cleanEmail = normalizeEmail(email);
    const cleanContactPerson = normalizeName(contactPerson);
    const cleanBusinessName = normalizeName(businessName);
    const cleanAgentName = agentName ? normalizeName(agentName) : '';
    const cleanCoPartnerName = coPartnerName ? normalizeName(coPartnerName) : '';
    const cleanAccountHolderName = normalizeName(accountHolderName);
    const cleanMobileNumber = normalizeIndianMobile(mobileNumber);
    const cleanAlternateNumber = alternateNumber ? normalizeIndianMobile(alternateNumber) : '';
    const cleanPanNo = normalizePAN(panNo);
    const cleanAadhaarNo = aadhaarNo ? normalizeAadhaar(aadhaarNo) : '';
    const cleanAccountNo = normalizeAccountNumber(accountNo);
    const cleanIfscCode = normalizeIFSC(ifscCode);

    // Check if user already exists (case-insensitive)
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const userExists = await User.findOne({
      email: { $regex: new RegExp('^' + escapedEmail + '$', 'i') }
    });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'An account with this email address already exists. Please use a different email or log in with your authorized credentials.' 
      });
    }

    // Get files if uploaded and upload to Cloudinary
    let businessLicense = '';
    if (req.files && req.files['businessLicense'] && req.files['businessLicense'][0]) {
      try {
        businessLicense = await uploadToCloudinary(req.files['businessLicense'][0].buffer, 'licenses');
      } catch (err) {
        console.error('Failed to upload businessLicense to Cloudinary:', err);
      }
    }

    let logo = '';
    if (req.files && req.files['logo'] && req.files['logo'][0]) {
      try {
        logo = await uploadToCloudinary(req.files['logo'][0].buffer, 'logos');
      } catch (err) {
        console.error('Failed to upload logo to Cloudinary:', err);
      }
    }

    let businessImages = [];
    if (req.files && req.files['businessImages'] && req.files['businessImages'].length > 0) {
      try {
        businessImages = await Promise.all(
          req.files['businessImages'].map(file => uploadToCloudinary(file.buffer, 'business_images'))
        );
      } catch (err) {
        console.error('Failed to upload businessImages to Cloudinary:', err);
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Parse businesses list
    let selectedBusinesses = [];
    if (req.body.businesses) {
      try {
        selectedBusinesses = JSON.parse(req.body.businesses);
      } catch (err) {
        console.error("Failed to parse businesses from req.body:", err.message);
      }
    }

    const mongoose = require('mongoose');

    if (selectedBusinesses.length === 0 && vendorType && category && subcategory) {
      selectedBusinesses = [{ vendorType, category, subcategory }];
    }

    const businesses = selectedBusinesses.map((biz) => {
      const bizId = new mongoose.Types.ObjectId().toString();
      return {
        _id: bizId,
        vendorType: biz.vendorType,
        category: biz.category,
        subcategory: biz.subcategory,
        baseVendorType: getBaseVendorType(biz.vendorType, biz.category, biz.subcategory),
        businessName,
        logo,
        businessLicense,
        businessImages
      };
    });

    const primaryBusinessId = businesses.length > 0 ? businesses[0]._id : new mongoose.Types.ObjectId().toString();

    // Compute baseVendorType for the primary business
    const baseVendorType = getBaseVendorType(vendorType, category, subcategory);

    // Compute categoryId fallback if not explicitly provided
    const finalCategoryId = categoryId || category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    const newVendorObjectId = new mongoose.Types.ObjectId().toString();
    const currentYear = new Date().getFullYear();
    const vendorCount = await User.countDocuments({ role: 'Vendor' });
    let seqNum = vendorCount + 1;
    let generatedVendorId = `ven-fic-${currentYear}-v${String(seqNum).padStart(3, '0')}`;
    let existingV = await User.findOne({ $or: [{ vendorId: generatedVendorId }, { registrationId: generatedVendorId }] });
    while (existingV) {
      seqNum++;
      generatedVendorId = `ven-fic-${currentYear}-v${String(seqNum).padStart(3, '0')}`;
      existingV = await User.findOne({ $or: [{ vendorId: generatedVendorId }, { registrationId: generatedVendorId }] });
    }

    // Create vendor user with normalized values
    const vendor = await User.create({
      _id: newVendorObjectId,
      vendorId: generatedVendorId,
      registrationId: generatedVendorId,
      name: cleanContactPerson, // Set name to contactPerson for general dashboard usage
      email: cleanEmail,
      password: hashedPassword,
      role: 'Vendor',
      status: 'Pending', // Put vendor registration under admin approval
      isApproved: false,
      vendorType,
      category,
      categoryId: finalCategoryId,
      subcategory,
      baseVendorType,
      businessName: cleanBusinessName,
      agentName: cleanAgentName,
      alternateVendorName: alternateVendorName ? normalizeName(alternateVendorName) : '',
      contactPerson: cleanContactPerson,
      address,
      street,
      city,
      state,
      country,
      postalCode,
      telephone,
      fax,
      mobileNumber: cleanMobileNumber,
      gstStatus,
      panNo: cleanPanNo,
      aadhaarNo: cleanAadhaarNo,
      companyRegNo,
      msmeStatus,
      accountHolderName: cleanAccountHolderName,
      bankName,
      bankBranch,
      bankStreet,
      bankCity,
      accountNo: cleanAccountNo,
      ifscCode: cleanIfscCode,
      swiftCode,
      businessLicense,
      alternateNumber: cleanAlternateNumber,
      coPartnerName: cleanCoPartnerName,
      logo,
      businessWebsite,
      operatingHours,
      businessImages,
      businesses,
      primaryBusinessId,
      isDirectRequest: true,
      joiningType: 'direct',
      createdVia: 'vendor_website',
      registrationSource: 'direct',
      requestOrigin: 'vendor_website',
      requestType: 'onboarding',
      phone: mobileNumber,
      pincode: postalCode,
      assignedArea: `${state || ''} / ${city || ''} (${postalCode || ''})`,
      assignedState: state || '',
      assignedDistrict: city || ''
    });

    res.status(201).json({
      success: true,
      message: 'Vendor registration submitted successfully and is awaiting administrative approval.',
      data: {
        id: vendor._id,
        vendorId: vendor.vendorId,
        businessName: vendor.businessName,
        status: vendor.status
      }
    });
  } catch (error) {
    console.error('Register Vendor Error:', error);
    const msg = error?.message || 'Server error during vendor registration';
    res.status(500).json({ success: false, message: msg });
  }
};

// @desc    Login Vendor
// @route   POST /api/auth/login-vendor
// @access  Public
const loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Strict role-scoped lookup: only find authorized Vendor or Admin accounts
    let user = await User.findOne({ 
      email: cleanEmail,
      role: { $in: ['Vendor', 'Admin'] }
    });
    if (!user) {
      user = await User.findOne({ 
        email: { $regex: new RegExp('^' + escapedEmail + '$', 'i') },
        role: { $in: ['Vendor', 'Admin'] }
      });
    }

    if (!user) {
      // Check if this email exists under another role (e.g. Member / Customer / Manager / Agent)
      const otherAccount = await User.findOne({ 
        email: { $regex: new RegExp('^' + escapedEmail + '$', 'i') }
      });
      if (otherAccount) {
        console.warn(`[Login Rejected] Account for email ${cleanEmail} has role '${otherAccount.role}' and is not authorized for the Vendor portal.`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials. Role is not authorized for the vendor portal.' 
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const userRole = (user.role || '').toLowerCase().trim();
    if (userRole !== 'vendor' && userRole !== 'admin') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials. Role is not authorized for the vendor portal.' 
      });
    }

    // Verify password strictly against hashed password FIRST
    let isMatch = false;
    if (user && user.password) {
      isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    }
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Account state & approval enforcement
    const vendorStatus = (user.status || '').toLowerCase().trim();
    const isApprovedStatus = ['approved', 'active', 'assigned'].includes(vendorStatus) && user.isApproved !== false;
    const onboardingStatuses = [
      'pending', 'submitted', 'pending_pincode_approval', 'pincode_approved',
      'kyc_pending', 'kyc_in_progress', 'payment_pending', 'pincode_rejected',
      'kyc_rejected', 'additional_information_required'
    ];
    const isOnboardingVendor = userRole === 'vendor' && (!isApprovedStatus && (onboardingStatuses.includes(vendorStatus) || user.isApproved === false));

    // Suspended or deactivated accounts
    if (user.isLocked === true || vendorStatus === 'suspended' || vendorStatus === 'inactive') {
      return res.status(403).json({ 
        success: false, 
        isTerminated: true,
        message: vendorStatus === 'inactive'
          ? 'Your vendor account has been deactivated by the Admin. Access denied.'
          : 'Your vendor account has been suspended. Please contact the administrator.' 
      });
    }

    // Rejected accounts
    if (vendorStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        isRejected: true,
        message: 'Your vendor application was rejected. Please contact the administrator.'
      });
    }

    // Fail closed on unknown or missing status
    if (!isApprovedStatus && !isOnboardingVendor && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Account status is invalid or pending administrative approval.'
      });
    }

    const userResponse = user.toObject ? user.toObject() : { ...user };
    delete userResponse.password;
    userResponse.id = user._id ? user._id.toString() : user._id;
    userResponse._id = userResponse.id;
    if (!userResponse.vendorId || !/^ven-fic-/i.test(userResponse.vendorId)) {
      try {
        const currentYear = new Date().getFullYear();
        const count = await User.countDocuments({ role: { $regex: 'vendor', $options: 'i' } }).catch(() => 1);
        const formatted = `ven-fic-${currentYear}-v${String(count || 1).padStart(3, '0')}`;
        userResponse.vendorId = (user.vendorId && /^ven-fic-/i.test(user.vendorId)) ? user.vendorId : formatted;
        userResponse.registrationId = (user.registrationId && /^ven-fic-/i.test(user.registrationId)) ? user.registrationId : formatted;
      } catch (e) {
        userResponse.vendorId = userResponse.vendorId || `ven-fic-2026-v001`;
        userResponse.registrationId = userResponse.registrationId || `ven-fic-2026-v001`;
      }
    }

    // If vendor is still in onboarding / approval pipeline, issue ONLY restricted onboarding token
    if (isOnboardingVendor) {
      userResponse.isApproved = false;
      const onboardingToken = generateToken(user._id, user.email, {
        role: 'Vendor',
        isApproved: false,
        status: user.status || 'Pending',
        tokenType: 'onboarding'
      });
      return res.status(200).json({
        success: true,
        isPendingApproval: true,
        token: onboardingToken,
        user: userResponse,
        message: 'Account is awaiting administrative approval. Access restricted to onboarding status.'
      });
    }

    // Approved vendor or admin
    userResponse.isApproved = true;
    const dashboardToken = generateToken(user._id, user.email, {
      role: user.role,
      isApproved: true,
      status: user.status
    });

    res.status(200).json({
      success: true,
      token: dashboardToken,
      user: userResponse
    });
  } catch (error) {
    console.error('Login Vendor Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during vendor login' });
  }
};

// @desc    Register Member
// @route   POST /api/auth/register-member
// @access  Public
const registerMember = async (req, res) => {
  try {
    const { name, email, password, planName } = req.body;

    if (!name || !email || !password || !planName) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    const nameErr = validateName(name, 'Member Name');
    if (nameErr) return res.status(400).json({ success: false, message: nameErr });

    const emailErr = validateEmail(email, 'Email Address');
    if (emailErr) return res.status(400).json({ success: false, message: emailErr });

    const passwordErr = validatePassword(password, 'Account Password');
    if (passwordErr) return res.status(400).json({ success: false, message: passwordErr });

    if (req.body.dob || req.body.dateOfBirth) {
      const dobErr = validateDOB(req.body.dob || req.body.dateOfBirth, 18, 'Date of Birth');
      if (dobErr) return res.status(400).json({ success: false, message: dobErr });
    }

    const cleanName = normalizeName(name);
    const cleanEmail = normalizeEmail(email);

    // Check if user already exists
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Fetch details of selected plan
    const plan = await MembershipPlan.findOne({ name: planName });
    if (!plan) {
      return res.status(400).json({ success: false, message: `Invalid membership plan: ${planName}` });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Member User
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: 'Member',
      status: 'Approved'
    });

    // Generate unique Membership ID
    const randomSuffix = Math.floor(100000 + Math.random() * 900000); // 6 digit random number
    const year = new Date().getFullYear();
    const membershipId = `MEM-${year}-${randomSuffix}`;

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.validityDays);

    // Generate QR code data URL (contains member identification details)
    const qrData = JSON.stringify({
      membershipId,
      name: user.name,
      email: user.email,
      plan: plan.name,
      discount: plan.discountPercent,
      expiresAt: expiresAt.toISOString().split('T')[0]
    });

    const qrCodeDataUrl = await qrcode.toDataURL(qrData);

    // Create Membership Card
    const card = await MembershipCard.create({
      userId: user._id,
      membershipId,
      planName: plan.name,
      discountPercent: plan.discountPercent,
      qrCode: qrCodeDataUrl,
      status: 'Active',
      expiresAt
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      card: {
        membershipId: card.membershipId,
        planName: card.planName,
        discountPercent: card.discountPercent,
        qrCode: card.qrCode,
        expiresAt: card.expiresAt
      }
    });
  } catch (error) {
    console.error('Register Member Error:', error);
    res.status(500).json({ success: false, message: 'Server error during member registration' });
  }
};

// @desc    Login Member / Admin
// @route   POST /api/auth/login-member
// @access  Public
const loginMember = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Strict role-scoped query: only Member or Admin
    let user = await User.findOne({ 
      email: cleanEmail,
      role: { $in: ['Member', 'Admin'] }
    });
    if (!user) {
      user = await User.findOne({ 
        email: { $regex: new RegExp('^' + escapedEmail + '$', 'i') },
        role: { $in: ['Member', 'Admin'] }
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Enforce account status
    const statusLower = (user.status || '').toLowerCase().trim();
    if (user.isLocked === true || statusLower === 'suspended' || statusLower === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account is suspended or deactivated.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Retrieve membership card if role is Member
    let card = null;
    if (user.role === 'Member') {
      card = await MembershipCard.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id, user.email, { role: user.role }),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      card: card ? {
        membershipId: card.membershipId,
        planName: card.planName,
        discountPercent: card.discountPercent,
        qrCode: card.qrCode,
        expiresAt: card.expiresAt
      } : null
    });
  } catch (error) {
    console.error('Login Member/Admin Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Send Terms & Conditions Email to Vendor
// @route   POST /api/auth/send-terms-email
// @access  Public
const sendTermsEmail = async (req, res) => {
  const nodemailer = require('nodemailer');
  const fs = require('fs');
  const path = require('path');
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Invalid email address format' });
  }

  const termsText = `
Terms & Conditions Agreement - Connect App

Dear Partner,

You have successfully agreed to the terms and conditions for registering your business on the Connect App platform. Below is a copy of the terms you agreed to:

1. Verification of Bank Details
By registering on the Connect App platform, you declare and warrant that all banking details provided, including Account Holder Name, Bank Name, Account Number, and IFSC/Swift Code, are correct, active, and belong to your registered business entity or co-partner.
Connect App is not responsible for any failed transfers, delayed payments, or transfers made to incorrect accounts due to false or mistyped information provided during registration.

2. Commission & Settlement
All transactions processed through the Connect App are subject to the platform commission structure. Settlements will be dispatched according to the cycle defined for your vendor category.

3. Compliance and Verification
We reserve the right to verify the authenticity of the documents uploaded (e.g. Business License, GSTIN, PAN card) before activating your vendor portal. Any discrepancy will result in rejection or suspension of your account.

4. Code of Conduct
Vendors must maintain high standards of service, charge members only the declared pricing/rates, and fulfill all bookings, reservations, or product purchases in a timely and professional manner.

Thank you for partnering with Connect App.

Best regards,
The Connect App Team
  `;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fafafa; color: #1e293b;">
      <h2 style="color: #eab308; border-bottom: 2px solid #eab308; padding-bottom: 10px; margin-top: 0;">Connect App - Terms & Conditions Agreement</h2>
      <p>Dear Partner,</p>
      <p>Thank you for agreeing to our terms. Below is a copy of the Terms & Conditions you accepted for your vendor account registration:</p>
      
      <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #334155;">
        <h4 style="margin-top: 0; color: #1e293b;">1. Verification of Bank Details</h4>
        <p>By registering on the Connect App platform, you declare and warrant that all banking details provided, including Account Holder Name, Bank Name, Account Number, and IFSC/Swift Code, are correct, active, and belong to your registered business entity or co-partner.</p>
        <p>Connect App is not responsible for any failed transfers, delayed payments, or transfers made to incorrect accounts due to false or mistyped information provided during registration.</p>

        <h4 style="color: #1e293b;">2. Commission & Settlement</h4>
        <p>All transactions processed through the Connect App are subject to the platform commission structure. Settlements will be dispatched according to the cycle defined for your vendor category.</p>

        <h4 style="color: #1e293b;">3. Compliance and Verification</h4>
        <p>We reserve the right to verify the authenticity of the documents uploaded (e.g. Business License, GSTIN, PAN card) before activating your vendor portal. Any discrepancy will result in rejection or suspension of your account.</p>

        <h4 style="color: #1e293b;">4. Code of Conduct</h4>
        <p>Vendors must maintain high standards of service, charge members only the declared pricing/rates, and fulfill all bookings, reservations, or product purchases in a timely and professional manner.</p>
      </div>
      
      <p>Thank you for partnering with Connect App.</p>
      <p style="margin-bottom: 0;">Best regards,<br/><strong>The Connect App Team</strong></p>
    </div>
  `;

  try {
    let transporter;
    const isRealSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    if (isRealSMTP) {
      console.log('Using configured SMTP settings to send terms email...');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Try to send using test account (Ethereal)
      console.log('No SMTP config found. Trying Ethereal test account...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      } catch (authErr) {
        console.warn('Ethereal account creation failed, trying fallback transporter or file logger:', authErr.message);
      }
    }

    if (transporter) {
      const fromEmail = process.env.SMTP_FROM || '"Connect App" <no-reply@connectapp.com>';
      const info = await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Connect App - Terms & Conditions Agreement',
        text: termsText,
        html: htmlContent
      });

      console.log(`✉️ Email sent successfully via ${isRealSMTP ? 'configured SMTP' : 'Ethereal'}!`);
      let previewUrl = null;
      if (!isRealSMTP) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL: %s', previewUrl);
      }
      
      // Write to a file as a backup
      const sentEmailsDir = path.join(__dirname, '../sent_emails');
      if (!fs.existsSync(sentEmailsDir)) {
        fs.mkdirSync(sentEmailsDir, { recursive: true });
      }
      const filename = `terms_email_${Date.now()}.txt`;
      fs.writeFileSync(path.join(sentEmailsDir, filename), `TO: ${email}\n\n${termsText}`);

      return res.status(200).json({
        success: true,
        message: isRealSMTP 
          ? 'Terms and conditions email sent successfully to your inbox!'
          : 'Terms and conditions email sent successfully (Ethereal test mode)!',
        previewUrl
      });
    }
  } catch (err) {
    console.error('Nodemailer send failed, executing local backup strategy:', err.message);
  }

  // Fallback: local file logging strategy if nodemailer/network fails
  try {
    const sentEmailsDir = path.join(__dirname, '../sent_emails');
    if (!fs.existsSync(sentEmailsDir)) {
      fs.mkdirSync(sentEmailsDir, { recursive: true });
    }
    const filename = `terms_email_${Date.now()}.txt`;
    fs.writeFileSync(path.join(sentEmailsDir, filename), `TO: ${email}\n\n${termsText}`);
    
    console.log(`✉️ Backup: Saved terms email locally to sent_emails/${filename}`);
    
    return res.status(200).json({
      success: true,
      message: 'Terms and conditions saved locally (network offline mode).'
    });
  } catch (backupErr) {
    console.error('Local backup strategy failed:', backupErr.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send terms email or save backup.'
    });
  }
};

module.exports = {
  registerVendor,
  loginVendor,
  registerMember,
  loginMember,
  sendTermsEmail
};
