/**
 * وظائف مساعدة للتعامل مع الصور - جانب الخادم فقط
 * Server-side image utilities with Sharp for Node.js environment
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    type: string;
    size: number;
    dimensions?: { width: number; height: number };
  };
}

/**
 * تحويل ملف إلى Base64 - جانب الخادم
 * @param file - ملف الصورة أو Buffer
 * @returns Base64 string
 */
export async function fileToBase64(file: File | Buffer): Promise<string> {
  try {
    let buffer: Buffer;
    
    if (file instanceof Buffer) {
      buffer = file;
    } else {
      // تحويل File إلى Buffer
      const arrayBuffer = await (file as File).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
    
    return buffer.toString('base64');
  } catch (error) {
    console.error('💥 Server-side fileToBase64 error:', error);
    throw new Error('فشل في تحويل الملف إلى Base64');
  }
}

/**
 * تنسيق حجم الملف
 * @param bytes - حجم الملف بالبايت
 * @returns حجم منسق
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * الحصول على تاريخ آخر تعديل آمن
 * @param file - ملف الصورة
 * @returns تاريخ آخر تعديل أو التاريخ الحالي
 */
export function getLastModifiedDate(file: File): Date {
  try {
    if (file.lastModified && !isNaN(file.lastModified) && file.lastModified > 0) {
      const date = new Date(file.lastModified);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    console.warn('⚠️ Invalid lastModified value, using current date:', {
      fileName: file.name,
      lastModified: file.lastModified,
      type: typeof file.lastModified
    });
    
    return new Date();
  } catch (error) {
    console.error('💥 Error getting lastModified date:', error);
    return new Date();
  }
}

/**
 * ضغط الصورة - جانب الخادم باستخدام Sharp
 * @param file - ملف الصورة أو Buffer
 * @param options - خيارات الضغط
 * @returns الصورة المضغوطة
 */
export async function compressImage(
  file: File | Buffer,
  options: ImageCompressionOptions = {}
): Promise<{ buffer: Buffer; base64: string }> {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 80, // Sharp uses 1-100 scale
    format = 'jpeg',
  } = options;

  try {
    console.log('🔄 Starting server-side image compression with Sharp:', {
      fileName: file instanceof File ? file.name : 'Buffer',
      originalSize: file instanceof File ? file.size : file.length,
      maxWidth,
      maxHeight,
      quality,
      format
    });

    // Dynamic import of Sharp to avoid client-side bundling and satisfy ESLint
    const { default: sharp } = await import('sharp');
    
    let inputBuffer: Buffer;
    
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    // Process image with Sharp
    let sharpInstance = sharp(inputBuffer);
    
    // Resize if needed
    sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

    // Set format and quality
    if (format === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    } else if (format === 'png') {
      sharpInstance = sharpInstance.png({ quality: Math.round(quality / 10) }); // PNG quality is 0-10
    } else if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    }

    const buffer = await sharpInstance.toBuffer();
    const base64 = buffer.toString('base64');

    console.log('✅ Server-side image compression completed:', {
      originalSize: inputBuffer.length,
      compressedSize: buffer.length,
      compressionRatio: ((inputBuffer.length - buffer.length) / inputBuffer.length * 100).toFixed(2) + '%',
      base64Length: base64.length,
      format
    });

    return { buffer, base64 };
  } catch (error) {
    console.error('💥 Server-side compression error:', error);
    throw new Error('فشل في ضغط الصورة على الخادم');
  }
}

/**
 * التحقق من نوع الملف
 * @param file - ملف الصورة
 * @returns true إذا كان النوع مدعوماً
 */
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  return allowedTypes.includes(file.type.toLowerCase());
}

/**
 * الحصول على أبعاد الصورة - جانب الخادم باستخدام Sharp
 * @param file - ملف الصورة أو Buffer
 * @returns أبعاد الصورة
 */
export async function getImageDimensions(file: File | Buffer): Promise<{ width: number; height: number }> {
  try {
    console.log('🔍 Getting image dimensions (server-side with Sharp):', {
      fileName: file instanceof File ? file.name : 'Buffer',
      fileSize: file instanceof File ? file.size : file.length,
      fileType: file instanceof File ? file.type : 'unknown'
    });

    // Dynamic import of Sharp to avoid client-side bundling and satisfy ESLint
    const { default: sharp } = await import('sharp');
    
    let inputBuffer: Buffer;
    
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    const metadata = await sharp(inputBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to get image dimensions from metadata');
    }

    const dimensions = { width: metadata.width, height: metadata.height };
    
    console.log('✅ Image dimensions retrieved (server-side):', {
      fileName: file instanceof File ? file.name : 'Buffer',
      dimensions,
      format: metadata.format,
      channels: metadata.channels
    });
    
    return dimensions;
  } catch (error) {
    console.error('💥 Failed to get image dimensions (server-side):', error);
    throw new Error('فشل في قراءة أبعاد الصورة على الخادم');
  }
}

/**
 * التحقق الشامل من صحة الصورة - جانب الخادم
 * @param file - ملف الصورة أو Buffer
 * @param options - خيارات التحقق
 * @returns نتيجة التحقق
 */
export async function validateImageFile(
  file: File | Buffer,
  options: {
    maxSizeInMB?: number;
    allowedTypes?: string[];
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<ImageValidationResult> {
  const {
    maxSizeInMB = 5,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    minWidth = 100,
    minHeight = 100,
    maxWidth = 4000,
    maxHeight = 4000,
  } = options;

  console.log('🔍 Starting server-side image validation:', {
    fileName: file instanceof File ? file.name : 'Buffer',
    fileSize: file instanceof File ? file.size : file.length,
    fileType: file instanceof File ? file.type : 'unknown',
    options
  });

  try {
    let fileSize: number;
    let fileType: string;
    
    if (file instanceof File) {
      fileSize = file.size;
      fileType = file.type;
      
      // التحقق من نوع الملف للـ File objects
      if (!allowedTypes.includes(fileType.toLowerCase())) {
        const error = `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`;
        console.warn('⚠️ Invalid file type:', { fileType, allowedTypes });
        return {
          isValid: false,
          error,
          details: { type: fileType, size: fileSize }
        };
      }
    } else {
      fileSize = file.length;
      fileType = 'unknown'; // سيتم تحديده من Sharp metadata
    }

    // التحقق من حجم الملف
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (fileSize > maxSizeInBytes) {
      const error = `حجم الملف كبير جداً. الحد الأقصى: ${maxSizeInMB}MB`;
      console.warn('⚠️ File too large:', { fileSize, maxSize: maxSizeInBytes });
      return {
        isValid: false,
        error,
        details: { type: fileType, size: fileSize }
      };
    }

    // التحقق من أبعاد الصورة باستخدام Sharp
    try {
      const dimensions = await getImageDimensions(file);
      
      if (dimensions.width < minWidth || dimensions.height < minHeight) {
        const error = `أبعاد الصورة صغيرة جداً. الحد الأدنى: ${minWidth}x${minHeight}px`;
        console.warn('⚠️ Image dimensions too small:', { dimensions, minWidth, minHeight });
        return {
          isValid: false,
          error,
          details: { type: fileType, size: fileSize, dimensions }
        };
      }

      if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
        const error = `أبعاد الصورة كبيرة جداً. الحد الأقصى: ${maxWidth}x${maxHeight}px`;
        console.warn('⚠️ Image dimensions too large:', { dimensions, maxWidth, maxHeight });
        return {
          isValid: false,
          error,
          details: { type: fileType, size: fileSize, dimensions }
        };
      }

      console.log('✅ Server-side image validation passed:', {
        fileName: file instanceof File ? file.name : 'Buffer',
        fileSize,
        fileType,
        dimensions
      });

      return {
        isValid: true,
        details: { type: fileType, size: fileSize, dimensions }
      };
    } catch (dimensionError) {
      console.error('💥 Error getting image dimensions:', dimensionError);
      return {
        isValid: false,
        error: 'فشل في قراءة أبعاد الصورة',
        details: { type: fileType, size: fileSize }
      };
    }
  } catch (error) {
    console.error('💥 Server-side image validation error:', error);
    return {
      isValid: false,
      error: 'فشل في التحقق من صحة الصورة على الخادم',
      details: { 
        type: file instanceof File ? file.type : 'unknown', 
        size: file instanceof File ? file.size : file.length 
      }
    };
  }
}