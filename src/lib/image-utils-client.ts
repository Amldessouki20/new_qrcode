/**
 * وظائف مساعدة للتعامل مع الصور - جانب العميل فقط
 * Client-side image utilities without Node.js dependencies
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
 * تحويل ملف إلى Base64
 * @param file - ملف الصورة
 * @returns Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // إزالة البادئة data:image/...;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsDataURL(file);
  });
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
 * ضغط الصورة - جانب العميل فقط
 * @param file - ملف الصورة
 * @param options - خيارات الضغط
 * @returns الصورة المضغوطة
 */
export function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<{ blob: Blob; base64: string }> {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.8,
  } = options;

  return new Promise((resolve, reject) => {
    console.log('🔄 Starting client-side image compression:', {
      fileName: file.name,
      originalSize: file.size,
      maxWidth,
      maxHeight,
      quality
    });

    const img = new Image();
    let objectUrl: string | null = null;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('فشل في إنشاء سياق الرسم'));
          return;
        }

        // حساب الأبعاد الجديدة
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // رسم الصورة المضغوطة
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('فشل في إنشاء الصورة المضغوطة'));
              return;
            }

            // تحويل إلى Base64
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              
              console.log('✅ Client-side image compression completed:', {
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(2) + '%',
                newDimensions: { width, height },
                base64Length: base64.length
              });
              
              resolve({ blob, base64 });
            };
            reader.onerror = () => reject(new Error('فشل في قراءة الصورة المضغوطة'));
            reader.readAsDataURL(blob);
            
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        console.error('💥 Client-side compression error:', error);
        reject(new Error('فشل في ضغط الصورة'));
        
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    };
    
    img.onerror = () => {
      reject(new Error('فشل في تحميل الصورة للضغط'));
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    try {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch (error) {
      console.error('💥 Error creating image URL:', error);
      reject(new Error('فشل في إنشاء رابط الصورة'));
    }
  });
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
 * الحصول على أبعاد الصورة - جانب العميل فقط
 * @param file - ملف الصورة
 * @returns أبعاد الصورة
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    console.log('🔍 Getting image dimensions (client-side):', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const img = new Image();
    let objectUrl: string | null = null;
    
    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      
      console.log('✅ Image dimensions retrieved (client-side):', {
        fileName: file.name,
        dimensions
      });
      
      resolve(dimensions);
      
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    
    img.onerror = () => {
      console.error('💥 Failed to load image for dimensions (client-side):', file.name);
      reject(new Error('فشل في تحميل الصورة لقراءة الأبعاد'));
      
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    try {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch (error) {
      console.error('💥 Failed to create object URL (client-side):', error);
      reject(new Error('فشل في إنشاء رابط الصورة'));
    }
  });
}

/**
 * التحقق الشامل من صحة الصورة - جانب العميل فقط
 * @param file - ملف الصورة
 * @param options - خيارات التحقق
 * @returns نتيجة التحقق
 */
export async function validateImageFile(
  file: File,
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

  console.log('🔍 Starting client-side image validation:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    options
  });

  try {
    // التحقق من نوع الملف
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      const error = `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`;
      console.warn('⚠️ Invalid file type:', { fileType: file.type, allowedTypes });
      return {
        isValid: false,
        error,
        details: { type: file.type, size: file.size }
      };
    }

    // التحقق من حجم الملف
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      const error = `حجم الملف كبير جداً. الحد الأقصى: ${maxSizeInMB}MB`;
      console.warn('⚠️ File too large:', { fileSize: file.size, maxSize: maxSizeInBytes });
      return {
        isValid: false,
        error,
        details: { type: file.type, size: file.size }
      };
    }

    // التحقق من أبعاد الصورة
    try {
      const dimensions = await getImageDimensions(file);
      
      if (dimensions.width < minWidth || dimensions.height < minHeight) {
        const error = `أبعاد الصورة صغيرة جداً. الحد الأدنى: ${minWidth}x${minHeight}px`;
        console.warn('⚠️ Image dimensions too small:', { dimensions, minWidth, minHeight });
        return {
          isValid: false,
          error,
          details: { type: file.type, size: file.size, dimensions }
        };
      }

      if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
        const error = `أبعاد الصورة كبيرة جداً. الحد الأقصى: ${maxWidth}x${maxHeight}px`;
        console.warn('⚠️ Image dimensions too large:', { dimensions, maxWidth, maxHeight });
        return {
          isValid: false,
          error,
          details: { type: file.type, size: file.size, dimensions }
        };
      }

      console.log('✅ Client-side image validation passed:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        dimensions
      });

      return {
        isValid: true,
        details: { type: file.type, size: file.size, dimensions }
      };
    } catch (dimensionError) {
      console.error('💥 Error getting image dimensions:', dimensionError);
      return {
        isValid: false,
        error: 'فشل في قراءة أبعاد الصورة',
        details: { type: file.type, size: file.size }
      };
    }
  } catch (error) {
    console.error('💥 Client-side image validation error:', error);
    return {
      isValid: false,
      error: 'فشل في التحقق من صحة الصورة',
      details: { type: file.type, size: file.size }
    };
  }
}