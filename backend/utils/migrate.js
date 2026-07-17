const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB, getIsMock } = require('../config/db');
const {
  User,
  MembershipPlan,
  MembershipCard,
  MembershipHistory,
  Product,
  Order,
  DeliveryPartner,
  Customer
} = require('../models/Schemas');

const DATA_DIR = path.join(__dirname, '../data');

const collectionsToMigrate = [
  { file: 'users.json', model: User, name: 'User' },
  { file: 'membershipplans.json', model: MembershipPlan, name: 'MembershipPlan' },
  { file: 'membershipcards.json', model: MembershipCard, name: 'MembershipCard' },
  { file: 'membershiphistorys.json', model: MembershipHistory, name: 'MembershipHistory' },
  { file: 'products.json', model: Product, name: 'Product' },
  { file: 'orders.json', model: Order, name: 'Order' },
  { file: 'deliverypartners.json', model: DeliveryPartner, name: 'DeliveryPartner' },
  { file: 'customers.json', model: Customer, name: 'Customer' }
];

const migrate = async () => {
  console.log('🏁 Starting data migration from JSON files to MongoDB...');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Error: MONGODB_URI is not defined in .env.');
    process.exit(1);
  }

  // Connect to DB
  await connectDB();

  if (getIsMock()) {
    console.error('❌ Error: Could not connect to real MongoDB. Migration aborted to prevent writing to mock database.');
    process.exit(1);
  }

  try {
    for (const coll of collectionsToMigrate) {
      const filePath = path.join(DATA_DIR, coll.file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${coll.file}, skipping.`);
        continue;
      }

      const fileData = fs.readFileSync(filePath, 'utf8');
      const documents = JSON.parse(fileData);

      if (!Array.isArray(documents)) {
        console.log(`⚠️  Data in ${coll.file} is not an array, skipping.`);
        continue;
      }

      console.log(`🧹 Clearing collection: ${coll.name}...`);
      await coll.model.deleteMany({});

      if (documents.length > 0) {
        console.log(`📥 Importing ${documents.length} documents into ${coll.name}...`);
        
        // Insert documents. Model.create preserves string _ids if provided.
        for (const doc of documents) {
          // If doc has an empty string _id or missing, mongoose generates it
          await coll.model.create(doc);
        }
        console.log(`✅ Imported ${coll.name} successfully!`);
      } else {
        console.log(`ℹ️  No documents to import for ${coll.name}.`);
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  }
};

migrate();
