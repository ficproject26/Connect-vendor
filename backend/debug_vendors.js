const mongoose = require('mongoose');

async function debug() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Connect_App:Connect123@cluster0.k1s5dbl.mongodb.net/connect_db?appName=Cluster0';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Get ALL users - check businesses array
  const users = await db.collection('users').find({}).toArray();
  
  // Build a map: businessId -> parent user
  const bizToUser = {};
  const productVendorIds = new Set();
  
  const products = await db.collection('products').find({}).toArray();
  products.forEach(p => { if (p.vendorId) productVendorIds.add(p.vendorId); });

  console.log(`\n=== ALL USERS WITH BUSINESSES ===`);
  for (const u of users) {
    if (u.businesses && Array.isArray(u.businesses) && u.businesses.length > 0) {
      console.log(`\n  User _id: ${u._id}, name: ${u.name || u.businessName}, email: ${u.email}, status: ${u.status}, role: ${u.role}`);
      u.businesses.forEach(b => {
        const bId = (b._id || '').toString();
        const match = productVendorIds.has(bId) ? ' *** MATCHES PRODUCT ***' : '';
        console.log(`    Business _id: ${bId}, name: ${b.businessName || b.name}${match}`);
        if (productVendorIds.has(bId)) {
          bizToUser[bId] = { userId: u._id, userName: u.name, userEmail: u.email, userStatus: u.status };
        }
      });
    }
  }

  // Also check if vendorId field on users matches
  console.log(`\n=== USERS WITH vendorId FIELD ===`);
  for (const u of users) {
    if (u.vendorId && productVendorIds.has(u.vendorId.toString())) {
      console.log(`  User _id: ${u._id}, vendorId: ${u.vendorId}, name: ${u.name}, status: ${u.status} *** MATCHES PRODUCT ***`);
    }
  }

  console.log(`\n=== BUSINESS-TO-USER MAPPING FOR PRODUCTS ===`);
  for (const [bizId, info] of Object.entries(bizToUser)) {
    const matchingProducts = products.filter(p => p.vendorId === bizId);
    console.log(`  bizId: ${bizId} -> user: ${info.userName} (${info.userEmail}), status: ${info.userStatus}`);
    matchingProducts.forEach(p => console.log(`    Product: ${p.name}`));
  }

  // Unmatched product vendorIds
  const matchedBizIds = new Set(Object.keys(bizToUser));
  const unmatched = [...productVendorIds].filter(id => !matchedBizIds.has(id));
  console.log(`\n=== UNMATCHED PRODUCT VENDOR IDS (${unmatched.length}) ===`);
  unmatched.forEach(id => console.log(`  ${id}`));

  mongoose.connection.close();
}

debug().catch(err => { console.error(err); process.exit(1); });
