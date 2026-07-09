const { connectDB } = require('../config/db');
const { User, MembershipCard, Product, Order } = require('../models/Schemas');

const runSimulation = async () => {
  console.log('🤖 Starting Order Simulation...');
  await connectDB();

  try {
    // 1. Find a Vendor (first approved vendor)
    const vendor = await User.findOne({ role: 'Vendor', status: 'Approved' });
    if (!vendor) {
      console.log('❌ No approved vendor found. Please seed the database first using "npm run seed".');
      process.exit(1);
    }
    console.log(`🏪 Selected Vendor: ${vendor.businessName} (${vendor.email})`);

    // 2. Find a Product belonging to this vendor
    let product = await Product.findOne({ vendorId: vendor._id.toString() });
    if (!product) {
      console.log('📦 No product found for this vendor. Creating a default test item...');
      product = await Product.create({
        vendorId: vendor._id.toString(),
        name: 'Classic Leather Jacket',
        description: 'Premium quality simulated item for order testing.',
        price: 1000,
        category: 'Mains',
        status: 'Available'
      });
    }
    console.log(`📦 Selected Product/Item: ${product.name} (Price: ₹${product.price})`);

    // 3. Find a Member user
    let member = await User.findOne({ role: 'Member' });
    if (!member) {
      console.log('👤 No Member found. Seeding John Doe...');
      member = await User.create({
        name: 'John Doe',
        email: 'member@vendor.com',
        password: 'password123',
        role: 'Member',
        status: 'Approved'
      });
    }
    console.log(`👤 Selected Member: ${member.name} (${member.email})`);

    // 4. Find or Create Membership Card for the Member
    let card = await MembershipCard.findOne({ userId: member._id.toString() });
    if (!card) {
      console.log('💳 Creating Gold Membership Card for member...');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      card = await MembershipCard.create({
        userId: member._id.toString(),
        membershipId: `MEM-${new Date().getFullYear()}-123456`,
        planName: 'Gold',
        discountPercent: 15,
        qrCode: 'data:image/png;base64,mockQRCode',
        status: 'Active',
        expiresAt
      });
    }
    console.log(`💳 Active Plan: ${card.planName} (${card.discountPercent}% Discount)`);

    // 5. Calculate Order Totals
    const totalAmount = product.price;
    const discountApplied = Math.round((totalAmount * card.discountPercent) / 100);
    const finalAmount = totalAmount - discountApplied;

    // 6. Map vendor type to order type
    let orderType = 'Order';
    if (vendor.vendorType?.includes('Hospital')) orderType = 'Appointment';
    else if (vendor.vendorType?.includes('Hotel') || vendor.vendorType?.includes('Service')) orderType = 'Booking';

    // 7. Create the simulation Order
    const orderData = {
      vendorId: vendor._id.toString(),
      memberId: member.email,
      memberName: member.name,
      type: orderType,
      items: [{
        productId: product._id.toString(),
        name: product.name,
        price: product.price,
        quantity: 1
      }],
      totalAmount,
      discountApplied,
      finalAmount,
      status: 'Pending',
      tableNumber: vendor.vendorType?.includes('Restaurant') ? (Math.floor(Math.random() * 10) + 1).toString() : undefined
    };

    const newOrder = await Order.create(orderData);
    console.log(`✅ Order successfully created in database!`);
    console.log(`----------------------------------------`);
    console.log(`Order ID:       ${newOrder._id}`);
    console.log(`Order Type:     ${newOrder.type}`);
    console.log(`Total Price:    ₹${newOrder.totalAmount}`);
    console.log(`Discount Card:  ${card.planName} (-₹${newOrder.discountApplied})`);
    console.log(`Final Payment:  ₹${newOrder.finalAmount}`);
    console.log(`----------------------------------------`);
    console.log('🔄 The Vendor Dashboard will automatically update and display this order.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during order simulation:', error);
    process.exit(1);
  }
};

runSimulation();
