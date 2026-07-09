const mongoose = require('mongoose');
const { getMockModel } = require('../utils/mockDb');

let isMock = false;

const attemptConnect = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Connect_App:Connect123@cluster0.k1s5dbl.mongodb.net/connect_db?appName=Cluster0';
  if (!uri) return;

  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('🚀 MongoDB connected successfully!');
    isMock = false;
  } catch (error) {
    console.log(`❌ MongoDB connection attempt failed: ${error.message}. Retrying in 10s...`);
    setTimeout(attemptConnect, 10000);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Connect_App:Connect123@cluster0.k1s5dbl.mongodb.net/connect_db?appName=Cluster0';
  if (!uri) {
    const errorMsg = '❌ No MONGODB_URI found in environment variables. MongoDB is strictly required.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('🚀 MongoDB connected successfully!');
    isMock = false;
  } catch (error) {
    const errorMsg = `❌ MongoDB connection error: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
};

const getModel = (name, schema) => {
  let mongooseModelCompiled = false;
  
  const getTarget = () => {
    if (mongoose.connection.readyState === 1) {
      if (!mongooseModelCompiled) {
        try {
          mongoose.model(name, schema);
        } catch (e) {
          // Model already compiled
        }
        mongooseModelCompiled = true;
      }
      return mongoose.model(name);
    } else {
      return getMockModel(name);
    }
  };

  // Return a Proxy that intercepts all method calls and forwards them to the active target
  return new Proxy({}, {
    get: (target, prop) => {
      const activeTarget = getTarget();
      const val = activeTarget[prop];
      if (typeof val === 'function') {
        return val.bind(activeTarget);
      }
      return val;
    },
    set: (target, prop, value) => {
      const activeTarget = getTarget();
      activeTarget[prop] = value;
      return true;
    }
  });
};

module.exports = { connectDB, getModel, getIsMock: () => mongoose.connection.readyState !== 1 };
