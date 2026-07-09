const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const USERS_FILE = path.join(__dirname, 'data/users.json');
const PRODUCTS_FILE = path.join(__dirname, 'data/products.json');

async function testLocal() {
  console.log('=== LOCAL MOCK FILES INSPECTION ===');
  if (fs.existsSync(USERS_FILE)) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const dhanuUsers = users.filter(u => u.email && u.email.toLowerCase().includes('dhanu'));
    console.log(`Found ${dhanuUsers.length} local users with "dhanu" in email:`);
    dhanuUsers.forEach(u => {
      console.log(`- ID: ${u._id} || Name: ${u.name} || Email: ${u.email} || Subcategory: ${u.subcategory} || BusinessName: ${u.businessName}`);
      console.log(`  Businesses:`, JSON.stringify(u.businesses, null, 2));
    });
  } else {
    console.log('No local users.json file found.');
  }

  if (fs.existsSync(PRODUCTS_FILE)) {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    console.log(`Total local products: ${products.length}`);
    const sampleProducts = products.slice(0, 10);
    console.log('Sample local products:');
    sampleProducts.forEach(p => {
      console.log(`  - Name: ${p.name} || category: ${p.category} || vendorId: ${p.vendorId}`);
    });
  }
}

async function testAtlas() {
  const { connectDB, getIsMock } = require('./config/db');
  const { User, Product } = require('./models/Schemas');
  
  await connectDB();
  if (getIsMock()) {
    console.log('Connected but fell back to Mock DB.');
    await testLocal();
    return;
  }

  console.log('=== ATLAS DB INSPECTION ===');
  const users = await User.find({});
  const dhanuUsers = users.filter(u => u.email && u.email.toLowerCase().includes('dhanu'));
  console.log(`Found ${dhanuUsers.length} Atlas users with "dhanu" in email:`);
  dhanuUsers.forEach(u => {
    console.log(`- ID: ${u._id} || Name: ${u.name} || Email: ${u.email} || Subcategory: ${u.subcategory} || BusinessName: ${u.businessName}`);
    console.log(`  Businesses:`, JSON.stringify(u.businesses, null, 2));
  });

  const products = await Product.find({});
  console.log(`Total Atlas products: ${products.length}`);
  const sampleProducts = products.slice(0, 10);
  console.log('Sample Atlas products:');
  sampleProducts.forEach(p => {
    console.log(`  - Name: ${p.name} || category: ${p.category} || vendorId: ${p.vendorId}`);
  });
}

async function main() {
  try {
    await testAtlas();
  } catch (err) {
    console.log('Atlas check failed, running local check. Error:', err.message);
    await testLocal();
  }
  process.exit(0);
}

main();
