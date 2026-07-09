require('dotenv').config();
const { connectDB } = require('./config/db');
const { User, Product } = require('./models/Schemas');

async function main() {
  await connectDB();
  const user = await User.findOne({ email: 'dhanushiyasri@gmail.com' });
  console.log('USER OBJECT:');
  console.log(JSON.stringify(user, null, 2));

  const products = await Product.find({ vendorId: user._id });
  console.log('PRODUCTS FOR THIS VENDOR:');
  console.log(products.map(p => ({ id: p._id, name: p.name, category: p.category, vendorId: p.vendorId })));

  process.exit(0);
}

main().catch(console.error);
