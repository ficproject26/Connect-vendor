const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const { connectDB } = require('./config/db');
const { User, Product } = require('./models/Schemas');

const USERS_FILE = path.join(__dirname, 'data/users.json');
const PRODUCTS_FILE = path.join(__dirname, 'data/products.json');

async function seed() {
  await connectDB();
  console.log('Connected to database.');

  // 1. Seed Users
  if (fs.existsSync(USERS_FILE)) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    console.log(`Loaded ${users.length} users from users.json.`);
    let userInsertedCount = 0;

    for (const u of users) {
      const exists = await User.findOne({ $or: [{ _id: u._id }, { email: u.email }] });
      if (!exists) {
        await User.create(u);
        userInsertedCount++;
      }
    }
    console.log(`Successfully seeded ${userInsertedCount} new users.`);
  } else {
    console.log('No users.json file found to seed.');
  }

  // 2. Seed Products
  if (fs.existsSync(PRODUCTS_FILE)) {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    console.log(`Loaded ${products.length} products from products.json.`);
    let productInsertedCount = 0;

    for (const p of products) {
      const exists = await Product.findOne({ _id: p._id });
      if (!exists) {
        await Product.create(p);
        productInsertedCount++;
      }
    }
    console.log(`Successfully seeded ${productInsertedCount} new products.`);
  } else {
    console.log('No products.json file found to seed.');
  }

  console.log('Database seeding process completed successfully!');
  mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
