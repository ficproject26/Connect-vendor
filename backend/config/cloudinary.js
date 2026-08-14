const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (fileBuffer, folder = 'connect_uploads', filenameHint = 'image.jpg') => {
  // 1. Try uploading to Cloudinary first
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const cloudinaryUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        uploadStream.end(fileBuffer);
      });
      if (cloudinaryUrl) return cloudinaryUrl;
    } catch (err) {
      console.warn('⚠️ Cloudinary upload failed, falling back to local file storage:', err.message || err);
    }
  }

  // 2. Fallback: Save locally to backend/uploads directory
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = (filenameHint && filenameHint.includes('.')) ? path.extname(filenameHint) : '.jpg';
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext || '.jpg'}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, fileBuffer);
    return `/uploads/${filename}`;
  } catch (localErr) {
    console.error('❌ Local file save failed:', localErr);
    // 3. Ultimate fallback: Data URI
    const mime = (filenameHint && filenameHint.endsWith('.png')) ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${fileBuffer.toString('base64')}`;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary
};
