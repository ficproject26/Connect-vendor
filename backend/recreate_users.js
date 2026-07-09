const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config();

const { connectDB } = require('./config/db');
const { User } = require('./models/Schemas');

async function recreateWithExactIds() {
  await connectDB();
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('vendor123', salt);

  // 1. Delete any existing documents with these emails first to avoid duplicates
  console.log('Cleaning up existing records...');
  await User.deleteMany({ email: { $in: ['dhanu@gmail.com', 'dhanushiyasri@gmail.com'] } });

  // 2. Re-create dhanu@gmail.com with EXACT string _id
  console.log('Creating dhanu@gmail.com with _id: qzu8rq1jimqga4pdj');
  await User.create({
    _id: "qzu8rq1jimqga4pdj",
    name: "Dhanu",
    email: "dhanu@gmail.com",
    password: hashedPassword,
    role: "Vendor",
    status: "Approved",
    vendorType: "Products",
    category: "IT & Office Equipment",
    subcategory: "Monitors",
    baseVendorType: "Electronics Vendor",
    businessName: "Dhanu  IT Product",
    alternateVendorName: "Dhanu",
    contactPerson: "Dhanu",
    address: "2nd cross,point living",
    street: "Neeladri Nagar",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    postalCode: "560105",
    mobileNumber: "9876543211",
    gstStatus: "Non-GST Declared",
    panNo: "123474556754",
    companyRegNo: "324645768",
    msmeStatus: "Non-MSME",
    accountHolderName: "dhanu",
    bankName: "sbi",
    bankBranch: "electronic city",
    bankStreet: "Neeladri Nagar",
    bankCity: "Bengaluru",
    accountNo: "2346675875",
    ifscCode: "IFSC00002354"
  });

  // 3. Re-create dhanushiyasri@gmail.com with EXACT string _id
  console.log('Creating dhanushiyasri@gmail.com with _id: 2l64elf7emqhm2o0m');
  await User.create({
    _id: "2l64elf7emqhm2o0m",
    name: "Dhanushiya",
    email: "dhanushiyasri@gmail.com",
    password: hashedPassword,
    role: "Vendor",
    status: "Approved",
    vendorType: "Services",
    category: "Healthcare Services",
    subcategory: "Hospitals",
    baseVendorType: "Hospital Vendor",
    businessName: "Dhanushiya Hospital",
    agentName: "mano",
    alternateVendorName: "",
    contactPerson: "Dhanushiya",
    address: "point living",
    street: "2nd cross",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    postalCode: "560105",
    mobileNumber: "9876543219",
    gstStatus: "Non-GST Declared",
    panNo: "928273059843",
    companyRegNo: "3719458435746",
    msmeStatus: "Non-MSME",
    accountHolderName: "Dhanushiya ",
    bankName: "sbi",
    bankBranch: "electronic city",
    bankStreet: "Neeladri Nagar",
    bankCity: "Bengaluru",
    accountNo: "234543685644",
    ifscCode: "SJKV23465456"
  });

  console.log('Successfully recreated both users with their original string IDs!');
  
  // Let's verify
  const users = await User.find({ email: { $in: ['dhanu@gmail.com', 'dhanushiyasri@gmail.com'] } });
  users.forEach(u => {
    console.log(`Verified - Email: ${u.email}, ID: ${u._id}`);
  });

  mongoose.connection.close();
}

recreateWithExactIds();
