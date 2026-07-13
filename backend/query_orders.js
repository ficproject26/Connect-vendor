const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const { connectDB, getIsMock } = require('./config/db');
const { Order, User } = require('./models/Schemas');

async function main() {
  await connectDB();
  console.log('Is Mock DB:', getIsMock());
  
  const users = await User.find({ role: 'Vendor' });
  console.log('Vendors in users collection:');
  users.forEach(u => {
    console.log(`- ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Type: ${u.vendorType} | Base: ${u.baseVendorType}`);
    if (u.businesses && u.businesses.length > 0) {
      console.log('  Businesses:');
      u.businesses.forEach(b => {
        console.log(`    * ID: ${b._id} | Name: ${b.businessName} | Type: ${b.vendorType}`);
      });
    }
  });

  const rawVendors = await mongoose.connection.db.collection('vendors').find({}).toArray();
  console.log('\nVendors in vendors collection:');
  rawVendors.forEach(v => {
    console.log(`- ID: ${v.id || v._id} | Name: ${v.name} | Active: ${v.active}`);
  });

  const orders = await Order.find({});
  console.log(`\nTotal Orders in DB: ${orders.length}`);
  orders.forEach(o => {
    console.log(`- ID: ${o.id || o._id} | Num: ${o.order_number} | VendorId: ${o.vendorId} | Type: ${o.type} | MemberName: ${o.memberName} | ProductDetails: ${o.product_details || (o.items && o.items[0]?.name)} | Status: ${o.status}`);
  });

  mongoose.connection.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
