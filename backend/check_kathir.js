const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Product = mongoose.connection.collection('products');
    const kathirProd = await Product.find({ name: { $regex: 'Kathir', $options: 'i' } }).toArray();

    console.log(`Found ${kathirProd.length} products matching Kathir:`);
    kathirProd.forEach(p => {
      console.log({
        id: String(p._id),
        name: p.name,
        category: p.category,
        subNavbarCategory: p.subNavbarCategory,
        imageUrl: p.imageUrl,
        image: p.image,
        imageUrls: p.imageUrls,
        img: p.img,
        vendorId: p.vendorId,
        vendorName: p.vendorName,
        createdAt: p.createdAt
      });
    });

    if (kathirProd.length === 0) {
      console.log('Showing recent 10 products from DB:');
      const recent = await Product.find({}).sort({ _id: -1 }).limit(10).toArray();
      recent.forEach(p => {
        console.log({
          id: String(p._id),
          name: p.name,
          imageUrl: p.imageUrl,
          image: p.image,
          imageUrls: p.imageUrls
        });
      });
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
