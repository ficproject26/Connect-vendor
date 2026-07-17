const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const DATA_DIR = path.join(__dirname, '../data');

const uploadFile = (filePath, fileName) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder: 'connect_uploads', public_id: path.parse(fileName).name },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
  });
};

const run = async () => {
  console.log('🚀 Starting Cloudinary Upload migration...');
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('❌ Uploads directory not found.');
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR);
  console.log(`Found ${files.length} files in uploads folder.`);

  const mapping = {};

  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file);
    const relativePath = `/uploads/${file}`;
    console.log(`Uploading ${file}...`);
    try {
      const url = await uploadFile(filePath, file);
      mapping[relativePath] = url;
      console.log(`Uploaded ${file} => ${url}`);
    } catch (err) {
      console.error(`❌ Failed to upload ${file}:`, err.message);
    }
  }

  console.log('\n📝 Applying replacements in JSON data files...');
  const dataFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

  for (const dataFile of dataFiles) {
    const dataFilePath = path.join(DATA_DIR, dataFile);
    let content = fs.readFileSync(dataFilePath, 'utf8');
    let replacedCount = 0;

    for (const [localPath, cloudUrl] of Object.entries(mapping)) {
      if (content.includes(localPath)) {
        // Replace all occurrences of localPath with cloudUrl
        content = content.split(localPath).join(cloudUrl);
        replacedCount++;
      }
    }

    if (replacedCount > 0) {
      fs.writeFileSync(dataFilePath, content, 'utf8');
      console.log(`✅ Updated ${dataFile} (${replacedCount} replacements applied)`);
    } else {
      console.log(`ℹ️ No replacements needed in ${dataFile}`);
    }
  }

  console.log('\n🎉 Cloudinary Upload migration complete!');
};

run().catch(err => {
  console.error('❌ Migration failed:', err);
});
