const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const CUSTOMERS_FILE = path.join(__dirname, '../data/customers.json');
const ORDERS_FILE = path.join(__dirname, '../data/orders.json');

const VENDOR_ID = '5piukcgydmqc0y6q3';

const newCourses = [
  {
    "_id": "course_webdev_5p",
    "createdAt": "2026-06-12T10:00:00.000Z",
    "updatedAt": "2026-06-12T10:00:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Full-Stack Web Development Bootcamp",
    "description": "Become a professional developer. Learn HTML, CSS, JavaScript, React, Node.js, and MongoDB. Includes hands-on projects, code reviews, and career counseling.",
    "price": 15000,
    "category": "Coding Bootcamps",
    "stock": 30,
    "duration": "12 Weeks",
    "status": "Available",
    "imageUrl": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60",
    "cardTypes": ["Silver", "Gold", "Diamond"]
  },
  {
    "_id": "course_english_5p",
    "createdAt": "2026-06-12T10:10:00.000Z",
    "updatedAt": "2026-06-12T10:10:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Spoken English & Professional Communication",
    "description": "Master public speaking, grammar, professional writing, and conversational English. Perfect for career advancement and general confidence building.",
    "price": 3500,
    "category": "Language Learning",
    "stock": 25,
    "duration": "8 Weeks",
    "status": "Available",
    "imageUrl": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500&auto=format&fit=crop&q=60",
    "cardTypes": ["Silver", "Gold", "Diamond"]
  },
  {
    "_id": "course_math_5p",
    "createdAt": "2026-06-12T10:20:00.000Z",
    "updatedAt": "2026-06-12T10:20:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Advanced Mathematics for IIT-JEE",
    "description": "Comprehensive coaching for competitive engineering entrance exams. Covers Calculus, Algebra, Coordinate Geometry, and Trigonometry.",
    "price": 8500,
    "category": "Test Preparation",
    "stock": 40,
    "duration": "6 Months",
    "status": "Available",
    "imageUrl": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60",
    "cardTypes": ["Silver", "Gold", "Diamond"]
  },
  {
    "_id": "course_design_5p",
    "createdAt": "2026-06-12T10:30:00.000Z",
    "updatedAt": "2026-06-12T10:30:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Digital Illustration & UI/UX Design",
    "description": "Learn modern digital art techniques, color theory, typography, and UI/UX design tools like Figma, Illustrator, and Photoshop.",
    "price": 4500,
    "category": "Arts & Music",
    "stock": 20,
    "duration": "6 Weeks",
    "status": "Available",
    "imageUrl": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60",
    "cardTypes": ["Silver", "Gold", "Diamond"]
  },
  {
    "_id": "course_music_5p",
    "createdAt": "2026-06-12T10:40:00.000Z",
    "updatedAt": "2026-06-12T10:40:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Piano Theory & Keyboard Practice",
    "description": "Step-by-step piano/keyboard instruction from absolute beginner to intermediate level. Learn sight-reading, chords, and music theory.",
    "price": 2500,
    "category": "Arts & Music",
    "stock": 15,
    "duration": "3 Months",
    "status": "Available",
    "imageUrl": "https://images.unsplash.com/photo-1552422535-c45813c61732?w=500&auto=format&fit=crop&q=60",
    "cardTypes": ["Silver", "Gold", "Diamond"]
  },
  {
    "_id": "course_online_5p",
    "createdAt": "2026-06-12T10:50:00.000Z",
    "updatedAt": "2026-06-12T10:50:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Intro to Python & Data Science",
    "description": "Learn Python programming, data analysis with Pandas, data visualization with Matplotlib, and basics of Machine Learning.",
    "price": 4999,
    "category": "Online Courses",
    "stock": 100,
    "duration": "10 Weeks",
    "status": "Available",
    "imageUrl": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format&fit=crop&q=60",
    "cardTypes": ["Silver", "Gold", "Diamond"]
  }
];

const newStudents = [
  {
    "_id": "student_amit_5p",
    "createdAt": "2026-06-12T11:00:00.000Z",
    "updatedAt": "2026-06-12T11:00:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Amit Sharma",
    "email": "amit.sharma@example.com",
    "phone": "9876543210",
    "ordersCount": 2,
    "totalSpent": 18500
  },
  {
    "_id": "student_priya_5p",
    "createdAt": "2026-06-12T11:10:00.000Z",
    "updatedAt": "2026-06-12T11:10:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Priya Patel",
    "email": "priya.patel@example.com",
    "phone": "9876543211",
    "ordersCount": 1,
    "totalSpent": 4500
  },
  {
    "_id": "student_vikram_5p",
    "createdAt": "2026-06-12T11:20:00.000Z",
    "updatedAt": "2026-06-12T11:20:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Vikram Singh",
    "email": "vikram.singh@example.com",
    "phone": "9876543212",
    "ordersCount": 1,
    "totalSpent": 8500
  },
  {
    "_id": "student_ananya_5p",
    "createdAt": "2026-06-12T11:30:00.000Z",
    "updatedAt": "2026-06-12T11:30:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Ananya Sen",
    "email": "ananya.sen@example.com",
    "phone": "9876543213",
    "ordersCount": 2,
    "totalSpent": 7499
  },
  {
    "_id": "student_rohan_5p",
    "createdAt": "2026-06-12T11:40:00.000Z",
    "updatedAt": "2026-06-12T11:40:00.000Z",
    "vendorId": VENDOR_ID,
    "name": "Rohan Gupta",
    "email": "rohan.gupta@example.com",
    "phone": "9876543214",
    "ordersCount": 1,
    "totalSpent": 15000
  }
];

const newEnrollments = [
  {
    "_id": "enrollment_1_5p",
    "createdAt": "2026-06-12T12:00:00.000Z",
    "updatedAt": "2026-06-12T12:00:00.000Z",
    "vendorId": VENDOR_ID,
    "memberId": "amit.sharma@example.com",
    "memberName": "Amit Sharma",
    "type": "Order",
    "items": [
      {
        "productId": "course_webdev_5p",
        "name": "Full-Stack Web Development Bootcamp",
        "price": 15000,
        "quantity": 1
      }
    ],
    "totalAmount": 15000,
    "discountApplied": 1500,
    "finalAmount": 13500,
    "status": "Completed"
  },
  {
    "_id": "enrollment_2_5p",
    "createdAt": "2026-06-12T12:05:00.000Z",
    "updatedAt": "2026-06-12T12:05:00.000Z",
    "vendorId": VENDOR_ID,
    "memberId": "amit.sharma@example.com",
    "memberName": "Amit Sharma",
    "type": "Order",
    "items": [
      {
        "productId": "course_english_5p",
        "name": "Spoken English & Professional Communication",
        "price": 3500,
        "quantity": 1
      }
    ],
    "totalAmount": 3500,
    "discountApplied": 350,
    "finalAmount": 3150,
    "status": "Enrolled"
  },
  {
    "_id": "enrollment_3_5p",
    "createdAt": "2026-06-12T12:10:00.000Z",
    "updatedAt": "2026-06-12T12:10:00.000Z",
    "vendorId": VENDOR_ID,
    "memberId": "priya.patel@example.com",
    "memberName": "Priya Patel",
    "type": "Order",
    "items": [
      {
        "productId": "course_design_5p",
        "name": "Digital Illustration & UI/UX Design",
        "price": 4500,
        "quantity": 1
      }
    ],
    "totalAmount": 4500,
    "discountApplied": 450,
    "finalAmount": 4050,
    "status": "Pending"
  },
  {
    "_id": "enrollment_4_5p",
    "createdAt": "2026-06-12T12:15:00.000Z",
    "updatedAt": "2026-06-12T12:15:00.000Z",
    "vendorId": VENDOR_ID,
    "memberId": "vikram.singh@example.com",
    "memberName": "Vikram Singh",
    "type": "Order",
    "items": [
      {
        "productId": "course_math_5p",
        "name": "Advanced Mathematics for IIT-JEE",
        "price": 8500,
        "quantity": 1
      }
    ],
    "totalAmount": 8500,
    "discountApplied": 850,
    "finalAmount": 7650,
    "status": "Completed"
  },
  {
    "_id": "enrollment_5_5p",
    "createdAt": "2026-06-12T12:20:00.000Z",
    "updatedAt": "2026-06-12T12:20:00.000Z",
    "vendorId": VENDOR_ID,
    "memberId": "ananya.sen@example.com",
    "memberName": "Ananya Sen",
    "type": "Order",
    "items": [
      {
        "productId": "course_music_5p",
        "name": "Piano Theory & Keyboard Practice",
        "price": 2500,
        "quantity": 1
      }
    ],
    "totalAmount": 2500,
    "discountApplied": 250,
    "finalAmount": 2250,
    "status": "Enrolled"
  },
  {
    "_id": "enrollment_6_5p",
    "createdAt": "2026-06-12T12:25:00.000Z",
    "updatedAt": "2026-06-12T12:25:00.000Z",
    "vendorId": VENDOR_ID,
    "memberId": "ananya.sen@example.com",
    "memberName": "Ananya Sen",
    "type": "Order",
    "items": [
      {
        "productId": "course_online_5p",
        "name": "Intro to Python & Data Science",
        "price": 4999,
        "quantity": 1
      }
    ],
    "totalAmount": 4999,
    "discountApplied": 500,
    "finalAmount": 4499,
    "status": "Enrolled"
  },
  {
    "_id": "enrollment_7_5p",
    "createdAt": "2026-06-12T12:30:00.000Z",
    "updatedAt": "2026-06-12T12:30:00.000Z",
    "vendorId": VENDOR_ID,
    "memberId": "rohan.gupta@example.com",
    "memberName": "Rohan Gupta",
    "type": "Order",
    "items": [
      {
        "productId": "course_webdev_5p",
        "name": "Full-Stack Web Development Bootcamp",
        "price": 15000,
        "quantity": 1
      }
    ],
    "totalAmount": 15000,
    "discountApplied": 1500,
    "finalAmount": 13500,
    "status": "Completed"
  }
];

function seed() {
  console.log('🌱 Seeding Dhanu (Education Vendor) data...');

  // 1. Seed Products (Courses)
  let products = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  }
  // Clear previous
  products = products.filter(p => p.vendorId !== VENDOR_ID);
  // Add new
  products.push(...newCourses);
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  console.log(`✅ Seeded ${newCourses.length} courses.`);

  // 2. Seed Customers (Students)
  let customers = [];
  if (fs.existsSync(CUSTOMERS_FILE)) {
    customers = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
  }
  // Clear previous
  customers = customers.filter(c => c.vendorId !== VENDOR_ID);
  // Add new
  customers.push(...newStudents);
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
  console.log(`✅ Seeded ${newStudents.length} students.`);

  // 3. Seed Orders (Enrollments)
  let orders = [];
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  }
  // Clear previous
  orders = orders.filter(o => o.vendorId !== VENDOR_ID);
  // Add new
  orders.push(...newEnrollments);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  console.log(`✅ Seeded ${newEnrollments.length} enrollments.`);

  console.log('🎉 Seeding successfully completed!');
}

seed();
