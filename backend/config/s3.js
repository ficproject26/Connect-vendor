const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let s3ClientInstance = null;

function getS3Client() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !bucket) {
    throw new Error('[AWS S3] AWS_REGION and AWS_S3_BUCKET must be configured in environment variables.');
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({ region });
  }
  return s3ClientInstance;
}

/**
 * Uploads a file buffer or path to AWS S3.
 * Returns the secure pre-signed view URL for the private S3 object.
 */
const uploadToS3 = async (fileBuffer, folder = 'connect_uploads', filenameHint = 'image.jpg') => {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const client = getS3Client();

    let buffer = fileBuffer;
    if (typeof fileBuffer === 'string') {
      if (fs.existsSync(fileBuffer)) {
        buffer = fs.readFileSync(fileBuffer);
        filenameHint = path.basename(fileBuffer);
      } else {
        throw new Error('Invalid file path or buffer provided for S3 upload');
      }
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Upload payload must be a valid Buffer or file path');
    }

    const ext = path.extname(filenameHint).toLowerCase() || '.jpg';
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.pdf') mimeType = 'application/pdf';

    const safeFolder = String(folder || 'connect_uploads').replace(/[^a-zA-Z0-9_-]/g, '_');
    const randSuffix = crypto.randomBytes(8).toString('hex');
    const objectKey = `${safeFolder}/${Date.now()}-${randSuffix}${ext}`;

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType
    });

    await client.send(putCommand);

    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey
    });

    const presignedUrl = await getSignedUrl(client, getCommand, { expiresIn: 604800 });
    return presignedUrl;
  } catch (err) {
    console.error('[AWS S3 Upload Error]:', err.message);
    throw new Error(`Failed to upload file to AWS S3: ${err.message}`);
  }
};

const getPresignedUrl = async (key, expiresIn = 3600) => {
  if (!key || typeof key !== 'string') return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const bucket = process.env.AWS_S3_BUCKET;
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key.replace(/^\/+/, '')
  });
  return await getSignedUrl(client, command, { expiresIn });
};

module.exports = {
  uploadToS3,
  uploadToCloudinary: uploadToS3,
  getPresignedUrl,
  getS3Client
};
