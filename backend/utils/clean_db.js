const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const { 
  User, 
  MembershipPlan, 
  MembershipCard, 
  Product, 
  Order, 
  DeliveryPartner, 
  Customer, 
  MembershipHistory 
} = require('../models/Schemas');

const cleanDatabase = async () => {
  try {
    await connectDB();
    console.log('🧹 Connected to MongoDB. Starting database cleanup...');

    // 1. Find mock users to delete
    const mockUsers = await User.find({
      $and: [
        { email: { $ne: 'admin@vendor.com' } },
        { 
          $or: [
            { email: /@vendor\.com$/i },
            { email: /@example\.com$/i }
          ]
        }
      ]
    });
    
    const mockUserIds = mockUsers.map(u => u._id.toString());
    const mockUserEmails = mockUsers.map(u => u.email);

    console.log(`🔍 Found ${mockUsers.length} mock users to clear:`, mockUserEmails);

    // 2. Delete products, orders, delivery partners, and cards belonging to mock users
    console.log('🗑️ Clearing catalog, orders, delivery partners, and cards for mock users...');
    const productsDeleted = await Product.deleteMany({ vendorId: { $in: mockUserIds } });
    const ordersDeleted = await Order.deleteMany({
      $or: [
        { vendorId: { $in: mockUserIds } },
        { memberId: { $in: mockUserIds } }
      ]
    });
    const deliveryDeleted = await DeliveryPartner.deleteMany({ vendor_id: { $in: mockUserIds } });
    const historyDeleted = await MembershipHistory.deleteMany({ userId: { $in: mockUserIds } });
    const cardsDeleted = await MembershipCard.deleteMany({ userId: { $in: mockUserIds } });

    console.log(`- Deleted ${productsDeleted.deletedCount} mock products`);
    console.log(`- Deleted ${ordersDeleted.deletedCount} mock orders`);
    console.log(`- Deleted ${deliveryDeleted.deletedCount} mock delivery partners`);
    console.log(`- Deleted ${historyDeleted.deletedCount} mock membership history entries`);
    console.log(`- Deleted ${cardsDeleted.deletedCount} mock membership cards`);

    // 3. Delete the mock users themselves
    console.log('👥 Clearing mock user accounts...');
    const usersDeleted = await User.deleteMany({ _id: { $in: mockUserIds } });
    console.log(`- Deleted ${usersDeleted.deletedCount} mock user accounts`);

    // 3. Ensure Admin exists
    const adminExists = await User.findOne({ email: 'admin@vendor.com' });
    if (!adminExists) {
      console.log('👤 Admin user not found. Creating default System Admin...');
      const salt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'System Admin',
        email: 'admin@vendor.com',
        password: adminPassword,
        role: 'Admin',
        status: 'Approved'
      });
      console.log('- Default System Admin created: email="admin@vendor.com", password="admin123"');
    } else {
      console.log('- System Admin account preserved.');
    }

    // 4. Ensure basic Membership Plans exist (required configuration)
    console.log('💳 Verifying membership configurations...');
    const plansCount = await MembershipPlan.countDocuments({});
    if (plansCount === 0) {
      console.log('- Seeding default membership plans...');
      await MembershipPlan.create([
        {
          name: 'Silver',
          price: 500,
          discountPercent: 10,
          validityDays: 30,
          benefits: ['10% Discount', 'Basic Support']
        },
        {
          name: 'Gold',
          price: 1000,
          discountPercent: 15,
          validityDays: 90,
          benefits: ['15% Discount', 'Priority Support', 'Featured Listing']
        },
        {
          name: 'Diamond',
          price: 2000,
          discountPercent: 20,
          validityDays: 365,
          benefits: ['20% Discount', 'Premium Support', 'Featured Listing', 'Exclusive Promotions']
        }
      ]);
      console.log('- Membership plans seeded.');
    } else {
      console.log('- Membership plans verified.');
    }

    console.log('✨ Database successfully reset to clean production state!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
};

cleanDatabase();
