/**
 * Client-side image compression utility
 * Optimizes high-resolution photos (e.g. 5MB-15MB from cameras/smartphones)
 * into lightweight web-ready JPEG images (~150KB-400KB) while preserving sharp visual quality.
 */

export const compressImage = async (file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) => {
  if (!file || !(file instanceof File) || !file.type.startsWith('image/')) {
    return file;
  }

  // If already under 350KB, return as-is
  if (file.size <= 350 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        // Calculate proportional dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Better downscaling smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw background white for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // If compressed blob is somehow larger than original, keep original
            if (blob.size >= file.size) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('Image compression exception, using original file:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
};
