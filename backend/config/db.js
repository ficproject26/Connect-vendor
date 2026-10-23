const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    const errorMsg = '❌ No MONGODB_URI found in environment variables. MongoDB is strictly required.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

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
