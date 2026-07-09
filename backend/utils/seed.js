const bcrypt = require('bcryptjs');
const qrcode = require('qrcode');
const { connectDB } = require('../config/db');
const { User, MembershipPlan, MembershipCard, Product, Order, DeliveryPartner, Customer, MembershipHistory } = require('../models/Schemas');

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

const seedData = async () => {
  // Ensure DB connects (mongoose or mock)
  await connectDB();

  console.log('🌱 Starting Database Seeding...');

  try {
    // 1. Clear Existing Data completely
    console.log('🧹 Clearing all collections...');
    await User.deleteMany({});
    await MembershipPlan.deleteMany({});
    await MembershipCard.deleteMany({});
    await MembershipHistory.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await DeliveryPartner.deleteMany({});
    await Customer.deleteMany({});

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const memberPassword = await bcrypt.hash('member123', salt);
    const vendorPassword = await bcrypt.hash('vendor123', salt);

    // 2. Create Admin
    console.log('👤 Seeding Admin...');
    await User.create({
      name: 'System Admin',
      email: 'admin@vendor.com',
      password: adminPassword,
      role: 'Admin',
      status: 'Approved'
    });

    // 3. Create Membership Plans
    console.log('💳 Seeding Membership Plans...');
    const silverPlan = await MembershipPlan.create({
      name: 'Silver',
      price: 500,
      discountPercent: 10,
      validityDays: 30,
      benefits: ['10% Discount', 'Basic Support']
    });

    const goldPlan = await MembershipPlan.create({
      name: 'Gold',
      price: 1000,
      discountPercent: 15,
      validityDays: 90,
      benefits: ['15% Discount', 'Priority Support', 'Featured Listing']
    });

    const diamondPlan = await MembershipPlan.create({
      name: 'Diamond',
      price: 2000,
      discountPercent: 20,
      validityDays: 365,
      benefits: ['20% Discount', 'Premium Support', 'Featured Listing', 'Exclusive Promotions']
    });

    // 4. Create Member
    console.log('👥 Seeding Member & Card...');
    const member = await User.create({
      name: 'John Doe',
      email: 'member@vendor.com',
      password: memberPassword,
      role: 'Member',
      status: 'Approved'
    });

    // Generate Card for member
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days validity
    const membershipId = `MEM-${new Date().getFullYear()}-882739`;
    
    const qrData = JSON.stringify({
      membershipId,
      name: member.name,
      email: member.email,
      plan: 'Gold',
      discount: 15,
      expiresAt: expiresAt.toISOString().split('T')[0]
    });
    const qrCodeDataUrl = await qrcode.toDataURL(qrData);

    await MembershipCard.create({
      userId: member._id,
      membershipId,
      planName: 'Gold',
      discountPercent: 15,
      qrCode: qrCodeDataUrl,
      status: 'Active',
      expiresAt
    });

    // 5. Create Approved Vendors for all 8 standard types
    console.log('🏪 Seeding Approved Vendors for 8 new types...');

    // 1. Services
    const servicesVendorType = 'Services';
    const servicesCategory = 'Healthcare Services';
    const servicesSubcategory = 'Hospitals';
    const servicesVendor = await User.create({
      name: 'Dr. Sarah Smith',
      email: 'services@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: servicesVendorType,
      category: servicesCategory,
      subcategory: servicesSubcategory,
      baseVendorType: getBaseVendorType(servicesVendorType, servicesCategory, servicesSubcategory),
      businessName: 'City Care Hospital',
      mobileNumber: '+91 98765 00001',
      address: '100 Medical Plaza, Health City',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234F',
      companyRegNo: 'U12345TN2026PTC000001',
      accountHolderName: 'Dr. Sarah Smith',
      bankName: 'State Bank of India',
      bankBranch: 'Health City Branch',
      bankStreet: 'Medical Plaza Road',
      bankCity: 'Chennai',
      accountNo: '123456789012',
      ifscCode: 'SBIN0001234'
    });

    // 2. Products
    const productsVendorType = 'Products';
    const productsCategory = 'Electronics';
    const productsSubcategory = 'Smartphones';
    const productsVendor = await User.create({
      name: 'Alex Johnson',
      email: 'products@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: productsVendorType,
      category: productsCategory,
      subcategory: productsSubcategory,
      baseVendorType: getBaseVendorType(productsVendorType, productsCategory, productsSubcategory),
      businessName: 'Apex Electronics',
      mobileNumber: '+91 98765 00002',
      address: '42 Silicon Valley Street, Tech City',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234G',
      companyRegNo: 'U12345TN2026PTC000002',
      accountHolderName: 'Alex Johnson',
      bankName: 'HDFC Bank',
      bankBranch: 'Tech City Branch',
      bankStreet: 'Silicon Valley Road',
      bankCity: 'Chennai',
      accountNo: '234567890123',
      ifscCode: 'HDFC0001234'
    });

    // 3. Daily Needs
    const dailyNeedsVendorType = 'Daily Needs';
    const dailyNeedsCategory = 'Grocery';
    const dailyNeedsSubcategory = 'Rice';
    const dailyNeedsVendor = await User.create({
      name: 'Gowri Krishnan',
      email: 'dailyneeds@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: dailyNeedsVendorType,
      category: dailyNeedsCategory,
      subcategory: dailyNeedsSubcategory,
      baseVendorType: getBaseVendorType(dailyNeedsVendorType, dailyNeedsCategory, dailyNeedsSubcategory),
      businessName: 'Gowri Fresh Supermarket',
      mobileNumber: '+91 98765 00003',
      address: '77 Market Lane, Fresh City',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234H',
      companyRegNo: 'U12345TN2026PTC000003',
      accountHolderName: 'Gowri Krishnan',
      bankName: 'ICICI Bank',
      bankBranch: 'Fresh City Branch',
      bankStreet: 'Market Lane Road',
      bankCity: 'Chennai',
      accountNo: '345678901234',
      ifscCode: 'ICIC0001234'
    });

    // 4. Food
    const foodVendorType = 'Food';
    const foodCategory = 'Restaurants';
    const foodSubcategory = 'Fine Dining';
    const foodVendor = await User.create({
      name: 'Chef Mario',
      email: 'food@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: foodVendorType,
      category: foodCategory,
      subcategory: foodSubcategory,
      baseVendorType: getBaseVendorType(foodVendorType, foodCategory, foodSubcategory),
      businessName: 'Bella Italia Bistro',
      mobileNumber: '+91 98765 00004',
      address: '42 Gastronomy Way, Foodville',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234I',
      companyRegNo: 'U12345TN2026PTC000004',
      accountHolderName: 'Chef Mario',
      bankName: 'Axis Bank',
      bankBranch: 'Foodville Branch',
      bankStreet: 'Gastronomy Way',
      bankCity: 'Chennai',
      accountNo: '456789012345',
      ifscCode: 'UTIB0001234'
    });

    // 5. Stay
    const stayVendorType = 'Stay';
    const stayCategory = 'Hotels';
    const staySubcategory = 'Deluxe';
    const stayVendor = await User.create({
      name: 'Harini Rajan',
      email: 'stay@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: stayVendorType,
      category: stayCategory,
      subcategory: staySubcategory,
      baseVendorType: getBaseVendorType(stayVendorType, stayCategory, staySubcategory),
      businessName: 'Seaside Grand Resort',
      mobileNumber: '+91 98765 00005',
      address: '777 Ocean Drive, Beachside',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234J',
      companyRegNo: 'U12345TN2026PTC000005',
      accountHolderName: 'Harini Rajan',
      bankName: 'State Bank of India',
      bankBranch: 'Beachside Branch',
      bankStreet: 'Ocean Drive',
      bankCity: 'Chennai',
      accountNo: '567890123456',
      ifscCode: 'SBIN0005678'
    });

    // 6. Travel
    const travelVendorType = 'Travel';
    const travelCategory = 'Tour Packages';
    const travelSubcategory = 'Family Packages';
    const travelVendor = await User.create({
      name: 'Ravi Kumar',
      email: 'travel@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: travelVendorType,
      category: travelCategory,
      subcategory: travelSubcategory,
      baseVendorType: getBaseVendorType(travelVendorType, travelCategory, travelSubcategory),
      businessName: 'GlobeTrotter Travels',
      mobileNumber: '+91 98765 00006',
      address: '50 Tourism Street, Journeyville',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234K',
      companyRegNo: 'U12345TN2026PTC000006',
      accountHolderName: 'Ravi Kumar',
      bankName: 'HDFC Bank',
      bankBranch: 'Journeyville Branch',
      bankStreet: 'Tourism Street',
      bankCity: 'Chennai',
      accountNo: '678901234567',
      ifscCode: 'HDFC0005678'
    });

    // 7. Membership
    const membershipVendorType = 'Membership';
    const membershipCategory = 'Gold Membership';
    const membershipSubcategory = 'Exclusive Offers';
    const membershipVendor = await User.create({
      name: 'Vikram Singh',
      email: 'membership@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: membershipVendorType,
      category: membershipCategory,
      subcategory: membershipSubcategory,
      baseVendorType: getBaseVendorType(membershipVendorType, membershipCategory, membershipSubcategory),
      businessName: 'Elite Club Memberships',
      mobileNumber: '+91 98765 00007',
      address: '12 Club Avenue, Luxury City',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234L',
      companyRegNo: 'U12345TN2026PTC000007',
      accountHolderName: 'Vikram Singh',
      bankName: 'ICICI Bank',
      bankBranch: 'Luxury City Branch',
      bankStreet: 'Club Avenue',
      bankCity: 'Chennai',
      accountNo: '789012345678',
      ifscCode: 'ICIC0005678'
    });

    // 8. Jobs
    const jobsVendorType = 'Jobs';
    const jobsCategory = 'IT Jobs';
    const jobsSubcategory = 'Full Stack Developer';
    const jobsVendor = await User.create({
      name: 'David Lee',
      email: 'jobs@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Approved',
      vendorType: jobsVendorType,
      category: jobsCategory,
      subcategory: jobsSubcategory,
      baseVendorType: getBaseVendorType(jobsVendorType, jobsCategory, jobsSubcategory),
      businessName: 'Talent Hunters Recruiter',
      mobileNumber: '+91 98765 00008',
      address: '88 Career Center, Jobsville',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234M',
      companyRegNo: 'U12345TN2026PTC000008',
      accountHolderName: 'David Lee',
      bankName: 'Axis Bank',
      bankBranch: 'Jobsville Branch',
      bankStreet: 'Career Center Road',
      bankCity: 'Chennai',
      accountNo: '890123456789',
      ifscCode: 'UTIB0005678'
    });

    // 6. Create Catalog Items for Approved Vendors
    console.log('📦 Seeding Products & Services...');
    
    // Services Products
    await Product.create({
      vendorId: servicesVendor._id,
      name: 'Dr. Robert Chen (Cardiologist)',
      description: 'Consultation for heart-related conditions, ECG, and reports analysis.',
      price: 1500,
      category: 'Hospitals',
      specialization: 'Cardiology Consultation',
      imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60'
    });

    await Product.create({
      vendorId: servicesVendor._id,
      name: 'Dr. Emily Watson (Pediatrician)',
      description: 'General checkups, vaccination schedules, and infant healthcare consults.',
      price: 1000,
      category: 'Hospitals',
      specialization: 'General Pediatrics',
      imageUrl: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=500&auto=format&fit=crop&q=60'
    });

    // Products Products
    await Product.create({
      vendorId: productsVendor._id,
      name: 'iPhone 15 Pro Max',
      description: 'Latest model with A17 Pro chip, titanium design, and advanced camera system.',
      price: 120000,
      category: 'Smartphones',
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60'
    });

    await Product.create({
      vendorId: productsVendor._id,
      name: 'Wireless Noise Cancelling Headphones',
      description: 'Over-ear headphones with active hybrid ANC and 30-hour battery life.',
      price: 8999,
      category: 'Smartphones',
      stock: 20,
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60'
    });

    // Daily Needs Products
    await Product.create({
      vendorId: dailyNeedsVendor._id,
      name: 'Organic Basmati Rice 5kg',
      description: 'Long grain, highly aromatic, aged premium organic Basmati rice.',
      price: 450,
      category: 'Rice',
      stock: 150,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60'
    });

    await Product.create({
      vendorId: dailyNeedsVendor._id,
      name: 'Fresh Farm Eggs 12pcs',
      description: 'Farm fresh, naturally laid organic brown eggs rich in protein.',
      price: 90,
      category: 'Rice',
      stock: 200,
      imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&auto=format&fit=crop&q=60'
    });

    // Food Products
    await Product.create({
      vendorId: foodVendor._id,
      name: 'Classic Margherita Pizza',
      description: 'Fresh mozzarella, tomato sauce, extra virgin olive oil, and fresh basil.',
      price: 450,
      category: 'Fine Dining',
      stock: 99,
      foodType: 'Veg',
      imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500&auto=format&fit=crop&q=60'
    });

    await Product.create({
      vendorId: foodVendor._id,
      name: 'Tiramisu Dessert',
      description: 'Layered Italian dessert with espresso-soaked ladyfingers and mascarpone cream.',
      price: 250,
      category: 'Fine Dining',
      stock: 50,
      foodType: 'Veg',
      imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60'
    });

    // Stay Products
    await Product.create({
      vendorId: stayVendor._id,
      name: 'Elegant Deluxe Room Stay',
      description: 'Spacious room with a king-sized bed, city view, mini-fridge, and complimentary breakfast.',
      price: 4500,
      category: 'Deluxe',
      roomType: 'Deluxe',
      imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=500&auto=format&fit=crop&q=60'
    });

    await Product.create({
      vendorId: stayVendor._id,
      name: 'Luxury Suite Stay',
      description: 'Premium suite with separate living area, king-sized bed, jacuzzi bathtub, and elite amenities.',
      price: 8500,
      category: 'Deluxe',
      roomType: 'Suite',
      imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&auto=format&fit=crop&q=60'
    });

    // Travel Products
    await Product.create({
      vendorId: travelVendor._id,
      name: 'Weekend Getaway Tour Package',
      description: 'All-inclusive 2-day family sightseeing package with guide and hotel transfers.',
      price: 8500,
      category: 'Family Packages',
      stock: 20,
      imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&auto=format&fit=crop&q=60'
    });

    // Membership Products
    await Product.create({
      vendorId: membershipVendor._id,
      name: 'VIP Club Access Pass',
      description: 'Gives priority reservations and complimentary mocktail on entrance.',
      price: 1500,
      category: 'Exclusive Offers',
      stock: 100,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60'
    });

    // Jobs Products
    await Product.create({
      vendorId: jobsVendor._id,
      name: 'Full Stack Software Developer Application',
      description: 'Submit your resume for immediate screening for a hybrid full-time role.',
      price: 0,
      category: 'Full Stack Developer',
      imageUrl: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=500&auto=format&fit=crop&q=60'
    });

    // 7. Create Pending Vendors (for approval list)
    console.log('⏳ Seeding Pending Registration Requests...');
    const pendingVendorType = 'Stay';
    const pendingCategory = 'Hotels';
    const pendingSubcategory = 'Luxury Hotels';
    await User.create({
      name: 'David Lee',
      email: 'pending@vendor.com',
      password: vendorPassword,
      role: 'Vendor',
      status: 'Pending',
      vendorType: pendingVendorType,
      category: pendingCategory,
      subcategory: pendingSubcategory,
      baseVendorType: getBaseVendorType(pendingVendorType, pendingCategory, pendingSubcategory),
      businessName: 'Seaside Grand Resort',
      mobileNumber: '+91 98765 00009',
      address: '777 Ocean Drive, Beachside',
      gstStatus: 'Non-GST Declared',
      panNo: 'ABCDE1234N',
      companyRegNo: 'U12345TN2026PTC000009',
      accountHolderName: 'David Lee',
      bankName: 'ICICI Bank',
      bankBranch: 'Beachside Branch',
      bankStreet: 'Ocean Drive Road',
      bankCity: 'Chennai',
      accountNo: '901234567890',
      ifscCode: 'ICIC0005678',
      businessLicense: '/uploads/sample_license.pdf'
    });

    console.log('✅ Database seeded successfully!');
    console.log('\nLogin Credentials:');
    console.log('------------------------------');
    console.log('Admin:        admin@vendor.com       / admin123');
    console.log('Member:       member@vendor.com      / member123');
    console.log('Services:     services@vendor.com    / vendor123');
    console.log('Products:     products@vendor.com    / vendor123');
    console.log('Daily Needs:  dailyneeds@vendor.com  / vendor123');
    console.log('Food:         food@vendor.com        / vendor123');
    console.log('Stay:         stay@vendor.com        / vendor123');
    console.log('Travel:       travel@vendor.com      / vendor123');
    console.log('Membership:   membership@vendor.com  / vendor123');
    console.log('Jobs:         jobs@vendor.com        / vendor123');
    console.log('Pending:      pending@vendor.com     / vendor123');
    console.log('------------------------------\n');
    
    if (require.main === module && process.exit) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    if (require.main === module && process.exit) {
      process.exit(1);
    }
  }
};

// If run directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
