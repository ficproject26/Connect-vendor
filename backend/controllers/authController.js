const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode');
const { User, MembershipPlan, MembershipCard } = require('../models/Schemas');

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_9999', {
    expiresIn: '30d',
  });
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

    // Validate fields
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

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|co|edu|gov|info|biz|us|uk|ca|au)$/i;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter valid email id.' });
    }

    // Validate phone number format (exactly 10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: 'Phone number must be 10 digits.' });
    }
    if (alternateNumber && !mobileRegex.test(alternateNumber)) {
      return res.status(400).json({ success: false, message: 'Alternate phone number must be 10 digits.' });
    }

    // Validate password complexity
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[@$!%*?&#_.\-+=^~`/\\{}()|[\]:;\"'<>,?]/.test(password);

    if (password.length < 6 || !hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters and contain uppercase letters, lowercase letters, numbers, and special characters (e.g. Dhanu@12345).' 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Get files if uploaded
    let businessLicense = '';
    if (req.files && req.files['businessLicense'] && req.files['businessLicense'][0]) {
      businessLicense = `/uploads/${req.files['businessLicense'][0].filename}`;
    }

    let logo = '';
    if (req.files && req.files['logo'] && req.files['logo'][0]) {
      logo = `/uploads/${req.files['logo'][0].filename}`;
    }

    let businessImages = [];
    if (req.files && req.files['businessImages']) {
      businessImages = req.files['businessImages'].map(file => `/uploads/${file.filename}`);
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

    // Create vendor user
    const vendor = await User.create({
      name: contactPerson, // Set name to contactPerson for general dashboard usage
      email,
      password: hashedPassword,
      role: 'Vendor',
      status: 'Approved', // Approved directly to remove admin approval after register
      vendorType,
      category,
      categoryId: finalCategoryId,
      subcategory,
      baseVendorType,
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
      businessLicense,
      alternateNumber,
      coPartnerName,
      logo,
      businessWebsite,
      operatingHours,
      businessImages,
      businesses,
      primaryBusinessId
    });

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully! You can log in now.',
      data: {
        id: vendor._id,
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

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || (user.role !== 'Vendor' && user.role !== 'Admin')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check Vendor status
    if (user.status === 'Pending') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is pending approval by the Admin. Please try again later.' 
      });
    } else if (user.status === 'Rejected') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account application has been rejected by the Admin.' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const userResponse = user.toObject ? user.toObject() : { ...user };
    delete userResponse.password;
    userResponse.id = user._id;

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: userResponse
    });
  } catch (error) {
    console.error('Login Vendor Error:', error);
    res.status(500).json({ success: false, message: 'Server error during vendor login' });
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

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|co|edu|gov|info|biz|us|uk|ca|au)$/i;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter valid email id.' });
    }

    // Validate password complexity
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[@$!%*?&#_.\-+=^~`/\\{}()|[\]:;\"'<>,?]/.test(password);

    if (password.length < 6 || !hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters and contain uppercase letters, lowercase letters, numbers, and special characters (e.g. Dhanu@12345).' 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
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
      name,
      email,
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || (user.role !== 'Member' && user.role !== 'Admin')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
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
      token: generateToken(user._id),
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

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
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
        previewUrl,
        localBackup: filename
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
      message: 'Terms and conditions saved locally (network offline mode).',
      localBackup: filename
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
