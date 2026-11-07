/**
 * High-Resolution Image Processing & Optimization Utility
 * The Bedtime Store - Luxury Boutique (Bahrain)
 * 
 * Supports uploading camera/phone raw photos up to 50MB+,
 * processing them into high-definition, fast-loading images
 * with crystal-clear fabric texture preservation.
 */

export interface OptimizedImageResult {
  dataUrl: string;
  originalFileName: string;
  originalSizeBytes: number;
  originalSizeFormatted: string;
  optimizedSizeBytes: number;
  optimizedSizeFormatted: string;
  width: number;
  height: number;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Optimizes a high-resolution image file up to 50MB
 * Resizes max dimension to 2560px for ultra-sharp retina display,
 * converting to high-fidelity JPEG/WebP at 92% quality.
 */
export async function optimizeImageFile(
  file: File,
  maxDimension = 2560,
  quality = 0.92
): Promise<OptimizedImageResult> {
  const MAX_FILE_SIZE_ALLOWED = 50 * 1024 * 1024; // 50 Megabytes

  if (file.size > MAX_FILE_SIZE_ALLOWED) {
    throw new Error(`File "${file.name}" exceeds the maximum 50MB image size limit (${formatBytes(file.size)}). Please choose an image up to 50MB.`);
  }

  // Ensure file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error(`File "${file.name}" is not a supported image format. Supported formats: JPG, PNG, WEBP, AVIF.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error(`Failed to read image file "${file.name}".`));
    };

    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error(`Empty data returned for "${file.name}".`));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        reject(new Error(`Failed to decode image "${file.name}". Please ensure it is a valid image file.`));
      };

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If image is already smaller than maxDimension and under 1.5MB, keep as is
        if (width <= maxDimension && height <= maxDimension && file.size < 1.5 * 1024 * 1024) {
          resolve({
            dataUrl: rawDataUrl,
            originalFileName: file.name,
            originalSizeBytes: file.size,
            originalSizeFormatted: formatBytes(file.size),
            optimizedSizeBytes: file.size,
            optimizedSizeFormatted: formatBytes(file.size),
            width,
            height,
          });
          return;
        }

        // Calculate scaling ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback if canvas context fails
          resolve({
            dataUrl: rawDataUrl,
            originalFileName: file.name,
            originalSizeBytes: file.size,
            originalSizeFormatted: formatBytes(file.size),
            optimizedSizeBytes: file.size,
            optimizedSizeFormatted: formatBytes(file.size),
            width,
            height,
          });
          return;
        }

        // High quality bicubic image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // White background for transparent PNGs converted to JPEG
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer modern WebP if supported, fallback to high quality JPEG
        let mimeType = 'image/jpeg';
        if (file.type === 'image/png') {
          mimeType = 'image/png';
        } else if (file.type === 'image/webp') {
          mimeType = 'image/webp';
        }

        const optimizedDataUrl = canvas.toDataURL(mimeType, quality);
        const approxBytes = Math.round((optimizedDataUrl.length * 3) / 4);

        resolve({
          dataUrl: optimizedDataUrl,
          originalFileName: file.name,
          originalSizeBytes: file.size,
          originalSizeFormatted: formatBytes(file.size),
          optimizedSizeBytes: approxBytes,
          optimizedSizeFormatted: formatBytes(approxBytes),
          width,
          height,
        });
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
