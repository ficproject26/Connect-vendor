const mongoose = require('mongoose');
const dns = require('dns');

// On Linux / AWS EC2 deployments, configure reliable public DNS servers for MongoDB SRV lookups
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if running in an environment where custom DNS cannot be configured
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    const errorMsg = '❌ No MONGODB_URI found in environment variables. MongoDB is strictly required.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const maskedUri = uri.replace(/:([^:@]+)@/, ':***@');
  console.log(`📡 Connecting to MongoDB at: ${maskedUri}`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('🚀 MongoDB connected successfully!');
  } catch (error) {
    if (error.message && error.message.includes('querySrv ENOTFOUND')) {
      console.error(`❌ MongoDB DNS SRV resolution failed for: ${maskedUri}`);
      console.error(`👉 Please ensure the MONGODB_URI in your server .env is set to your active MongoDB Atlas cluster URL and not an old/deleted cluster.`);
    }
    const errorMsg = `❌ MongoDB connection error: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
};

const getModel = (name, schema) => {
  try {
    return mongoose.model(name);
  } catch (e) {
    return mongoose.model(name, schema);
  }
};

module.exports = { connectDB, getModel, getIsMock: () => false };
