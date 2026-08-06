const mongoose = require('mongoose');

async function testPublicProducts() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Connect_App:Connect123@cluster0.k1s5dbl.mongodb.net/connect_db?appName=Cluster0';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. Fetch all users from database
  const allUsers = await db.collection('users').find({}).toArray();

  const suspendedIds = new Set();
  const suspendedNames = new Set();
  const vendorMap = {};

  allUsers.forEach(vendor => {
    const vStatus = (vendor.status || '').toLowerCase().trim();
    const isUserSuspended = ['suspended', 'inactive', 'rejected'].includes(vStatus);

    const vendorIdStr = vendor._id ? vendor._id.toString() : '';
    const emailLower = vendor.email ? vendor.email.toLowerCase().trim() : '';

    console.log(`User: ${vendor.name || vendor.businessName} (${emailLower}) - status: "${vendor.status}", isActive: ${vendor.isActive}, isSuspended: ${isUserSuspended}`);

    if (isUserSuspended) {
      if (vendorIdStr) suspendedIds.add(vendorIdStr);
      if (vendor.vendorId) suspendedIds.add(vendor.vendorId.toString());
      if (vendor.registrationId) suspendedIds.add(vendor.registrationId.toString());
      if (emailLower) suspendedIds.add(emailLower);
      if (vendor.businessName) suspendedNames.add(vendor.businessName.toLowerCase().trim());
      if (vendor.name) suspendedNames.add(vendor.name.toLowerCase().trim());

      if (vendor.businesses && Array.isArray(vendor.businesses)) {
        vendor.businesses.forEach(b => {
          if (b._id) suspendedIds.add(b._id.toString());
          if (b.businessName) suspendedNames.add(b.businessName.toLowerCase().trim());
          if (b.name) suspendedNames.add(b.name.toLowerCase().trim());
        });
      }
    } else {
      if (vendor.businesses && Array.isArray(vendor.businesses)) {
        vendor.businesses.forEach(biz => {
          const bizStatus = (biz.status || '').toLowerCase().trim();
          const isBizSuspended = ['suspended', 'inactive', 'rejected'].includes(bizStatus);
          
          if (isBizSuspended) {
            if (biz._id) suspendedIds.add(biz._id.toString());
            if (biz.businessName) suspendedNames.add(biz.businessName.toLowerCase().trim());
            if (biz.name) suspendedNames.add(biz.name.toLowerCase().trim());
          } else if (biz._id) {
            vendorMap[biz._id.toString()] = biz;
          }
        });
      }
      if (vendorIdStr) vendorMap[vendorIdStr] = vendor;
      if (vendor.vendorId) vendorMap[vendor.vendorId.toString()] = vendor;
      if (vendor.registrationId) vendorMap[vendor.registrationId.toString()] = vendor;
      if (emailLower) vendorMap[emailLower] = vendor;
    }
  });

  console.log('\n=== SUSPENDED IDS ===', [...suspendedIds]);
  console.log('=== SUSPENDED NAMES ===', [...suspendedNames]);

  // 2. Fetch all products
  const products = await db.collection('products').find({}).toArray();

  const activeProducts = products.filter(p => {
    const vIdStr = (p.vendorId || p.vendor_id || '').toString();
    const vEmail = (p.vendorEmail || '').toLowerCase().trim();
    const pVendorName = (p.vendorName || p.brand || p.companyName || '').toLowerCase().trim();

    if (suspendedIds.has(vIdStr) || (vEmail && suspendedIds.has(vEmail))) {
      return false;
    }
    if (pVendorName && suspendedNames.has(pVendorName)) {
      return false;
    }
    return true;
  });

  console.log(`\nTotal products in DB: ${products.length}`);
  console.log(`Active products returned: ${activeProducts.length}`);
  console.log('\nReturned Product Names & Vendor IDs:');
  activeProducts.forEach(p => {
    console.log(`  - Product: "${p.name}", vendorId: "${p.vendorId}", brand/vendorName: "${p.brand || p.vendorName || ''}"`);
  });

  mongoose.connection.close();
}

testPublicProducts().catch(err => { console.error(err); process.exit(1); });
