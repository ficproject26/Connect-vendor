const mongoose = require('mongoose');

async function debug() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Connect-app:Connect123@cluster0.fzj1k5l.mongodb.net/?appName=Cluster0';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({ role: 'Vendor' }).toArray();
  
  console.log(`\n=== VENDOR USERS AND THEIR BUSINESSES ===`);
  for (const u of users) {
    console.log(`\nUser _id: ${u._id}, email: ${u.email}, name: ${u.name || u.businessName}, status: ${u.status}, isActive: ${u.isActive}`);
    if (u.businesses && Array.isArray(u.businesses)) {
      u.businesses.forEach((b, idx) => {
        console.log(`  [${idx}] _id: ${b._id}, vendorType: "${b.vendorType}", category: "${b.category}", subcategory: "${b.subcategory}", status: "${b.status}", isActive: ${b.isActive}`);
      });
    }
  }

  mongoose.connection.close();
}

debug().catch(err => { console.error(err); process.exit(1); });
