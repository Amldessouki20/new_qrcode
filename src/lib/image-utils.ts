/**
 * وظائف مساعدة للتعامل مع الصور
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
 * Compress image using Sharp for server-side processing
 * This function works in both browser and server environments
 */
export async function compressImage(
  file: File | Buffer,
  options: ImageCompressionOptions = {}
): Promise<{ blob: Blob | Buffer; base64: string }> {
  const { maxWidth = 800, maxHeight = 800, quality = 0.8 } = options;
  
  console.log('🗜️ Starting image compression:', {
    maxWidth,
    maxHeight,
    quality,
    inputSize: 'size' in file ? file.size : (file as Buffer).length,
    inputType: 'type' in file ? file.type : 'buffer'
  });

  // Check if we're in a server environment
  if (typeof window === 'undefined') {
    // Server-side compression using Sharp
    return compressImageServer(file, { maxWidth, maxHeight, quality });
  } else {
    // Client-side compression using Canvas API
    return compressImageClient(file as File, { maxWidth, maxHeight, quality });
  }
}

/**
 * Server-side image compression using Sharp
 */
async function compressImageServer(
  file: File | Buffer,
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<{ blob: Buffer; base64: string }> {
  try {
    const { default: sharp } = await import('sharp');
    let buffer: Buffer;
    
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else {
      // File object
      const arrayBuffer = await (file as File).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
    
    const { maxWidth, maxHeight, quality } = options;
    
    // Process image with Sharp
    const processedBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: Math.round(quality * 100) })
      .toBuffer();
    
    const base64 = processedBuffer.toString('base64');
    
    console.log('✅ Server-side image compression completed:', {
      originalSize: buffer.length,
      compressedSize: processedBuffer.length,
      compressionRatio: ((buffer.length - processedBuffer.length) / buffer.length * 100).toFixed(2) + '%',
      base64Length: base64.length
    });
    
    return { blob: processedBuffer, base64 };
  } catch (error) {
    console.error('💥 Server-side image compression error:', error);
    throw new Error('فشل في ضغط الصورة على الخادم');
  }
}

/**
 * Client-side image compression using Canvas API
 */
async function compressImageClient(
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<{ blob: Blob; base64: string }> {
  return new Promise((resolve, reject) => {
    const { maxWidth, maxHeight, quality } = options;
    const img = new Image();
    let objectUrl: string | null = null;
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('فشل في إنشاء سياق الرسم');
        }
        
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('فشل في إنشاء الصورة المضغوطة'));
              return;
            }
            
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
    } catch  {
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
 * التحقق من حجم الملف
 * @param file - ملف الصورة
 * @param maxSizeInMB - الحد الأقصى بالميجابايت
 * @returns true إذا كان الحجم مقبولاً
 */
export function validateFileSize(file: File, maxSizeInMB: number = 2): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * التحقق الشامل من صحة الصورة
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
  // Safely handle lastModified date
  const getLastModifiedDate = (timestamp: number): string => {
    try {
      if (!timestamp || timestamp <= 0) {
        return new Date().toISOString(); // Use current date as fallback
      }
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return new Date().toISOString(); // Use current date if invalid
      }
      return date.toISOString();
    } catch (error) {
      console.warn('⚠️ Invalid lastModified timestamp:', timestamp, error);
      return new Date().toISOString(); // Use current date as fallback
    }
  };

  console.log('🔍 Starting image validation:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    lastModified: getLastModifiedDate(file.lastModified),
    options
  });

  const {
    maxSizeInMB = 2,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp','image/jpg'],
    minWidth = 50,
    minHeight = 50,
    maxWidth = 4000,
    maxHeight = 4000
  } = options;

  // التحقق من نوع الملف
  console.log('📋 Checking file type:', { fileType: file.type, allowedTypes });
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    const error = `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`;
    console.error('❌ File type validation failed:', error);
    return {
      isValid: false,
      error,
      details: { type: file.type, size: file.size }
    };
  }
  console.log('✅ File type validation passed');

  // التحقق من حجم الملف
  console.log('📏 Checking file size:', { fileSize: file.size, maxSizeInMB, maxSizeInBytes: maxSizeInMB * 1024 * 1024 });
  if (!validateFileSize(file, maxSizeInMB)) {
    const error = `حجم الملف كبير جداً. الحد الأقصى ${maxSizeInMB} ميجابايت`;
    console.error('❌ File size validation failed:', error);
    return {
      isValid: false,
      error,
      details: { type: file.type, size: file.size }
    };
  }
  console.log('✅ File size validation passed');

  // التحقق من أبعاد الصورة
  console.log('📐 Starting image dimensions check...');
  try {
    const dimensions = await getImageDimensions(file);
    console.log('✅ Image dimensions retrieved:', dimensions);
    
    if (dimensions.width < minWidth || dimensions.height < minHeight) {
      const error = `أبعاد الصورة صغيرة جداً. الحد الأدنى ${minWidth}x${minHeight} بكسل`;
      console.error('❌ Image dimensions too small:', { dimensions, minWidth, minHeight });
      return {
        isValid: false,
        error,
        details: { type: file.type, size: file.size, dimensions }
      };
    }

    if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
      const error = `أبعاد الصورة كبيرة جداً. الحد الأقصى ${maxWidth}x${maxHeight} بكسل`;
      console.error('❌ Image dimensions too large:', { dimensions, maxWidth, maxHeight });
      return {
        isValid: false,
        error,
        details: { type: file.type, size: file.size, dimensions }
      };
    }

    console.log('🎉 Image validation completed successfully:', { dimensions });
    return {
      isValid: true,
      details: { type: file.type, size: file.size, dimensions }
    };
  } catch (error) {
    console.error('💥 Error getting image dimensions:', error);
    console.error('File details at error:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    return {
      isValid: false,
      error: 'فشل في قراءة الصورة. تأكد من أن الملف صورة صحيحة',
      details: { type: file.type, size: file.size }
    };
  }
}

/**
 * Get image dimensions using Sharp for server-side processing
 * This function works in both browser and server environments
 */
export function getImageDimensions(file: File | Buffer | { size: number; type: string; name: string }): Promise<{ width: number; height: number }> {
  console.log('📐 Getting image dimensions for:', { 
    name: 'name' in file ? file.name : 'buffer', 
    size: 'size' in file ? file.size : (file as Buffer).length, 
    type: 'type' in file ? file.type : 'unknown' 
  });
  
  // Check if we're in a server environment
  if (typeof window === 'undefined') {
    // Server-side processing using Sharp
    return getImageDimensionsServer(file);
  } else {
    // Client-side processing using Image API
    return getImageDimensionsClient(file as File);
  }
}

/**
 * Server-side image dimensions using Sharp
 */
async function getImageDimensionsServer(file: File | Buffer | { size: number; type: string; name: string }): Promise<{ width: number; height: number }> {
  try {
    const { default: sharp } = await import('sharp');
    let buffer: Buffer;
    
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if ('arrayBuffer' in file) {
      // File object
      const arrayBuffer = await (file as File).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // File-like object from API (base64 converted to buffer)
      throw new Error('Invalid file type for server processing');
    }
    
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }
    
    console.log('✅ Server-side image dimensions:', { 
      width: metadata.width, 
      height: metadata.height,
      format: metadata.format
    });
    
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    console.error('💥 Server-side image processing error:', error);
    throw new Error('فشل في معالجة الصورة على الخادم');
  }
}

/**
 * Client-side image dimensions using Image API
 */
function getImageDimensionsClient(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;
    
    img.onload = () => {
      console.log('✅ Client-side image loaded successfully:', { 
        naturalWidth: img.naturalWidth, 
        naturalHeight: img.naturalHeight,
        src: img.src.substring(0, 50) + '...'
      });
      
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      resolve(dimensions);
      
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        console.log('🗑️ Object URL revoked');
      }
    };
    
    img.onerror = (event) => {
      console.error('💥 Client-side image load error:', event);
      console.error('Image src:', img.src.substring(0, 100) + '...');
      console.error('File details:', { name: file.name, size: file.size, type: file.type });
      
      const error = new Error('فشل في تحميل الصورة');
      reject(error);
      
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    
    try {
      objectUrl = URL.createObjectURL(file);
      console.log('🔗 Object URL created for client-side processing');
      img.src = objectUrl;
    } catch (error) {
      console.error('💥 Error creating object URL:', error);
      console.error('File details at error:', { 
        name: file.name, 
        size: file.size, 
        type: file.type, 
        lastModified: file.lastModified 
      });
      reject(new Error('فشل في إنشاء رابط الصورة'));
    }
  });
}

/**
 * إنشاء معاينة للصورة
 * @param file - ملف الصورة
 * @returns رابط المعاينة
 */
export function generateImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * تحويل الصورة إلى Base64
 * @param file - ملف الصورة
 * @returns Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  console.log('🔄 Converting file to base64:', { name: file.name, size: file.size, type: file.type });
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        console.log('✅ Base64 conversion successful:', { 
          resultLength: reader.result.length,
          preview: reader.result.substring(0, 100) + '...'
        });
        resolve(reader.result);
      } else {
        console.error('❌ FileReader result is not a string:', typeof reader.result);
        reject(new Error('فشل في تحويل الملف إلى Base64'));
      }
    };
    
    reader.onerror = (event) => {
      console.error('💥 FileReader error:', event);
      console.error('File details:', { name: file.name, size: file.size, type: file.type });
      reject(new Error('فشل في قراءة الملف'));
    };
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        console.log(`📊 Base64 conversion progress: ${progress.toFixed(1)}%`);
      }
    };
    
    try {
      reader.readAsDataURL(file);
      console.log('🔄 Started reading file as data URL');
    } catch (error) {
      console.error('💥 Error starting FileReader:', error);
      reject(new Error('فشل في بدء قراءة الملف'));
    }
  });
}

/**
 * تحويل Base64 إلى File
 * @param base64 - Base64 string
 * @param filename - اسم الملف
 * @returns File object
 */
export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}

/**
 * قص الصورة إلى شكل دائري
 * @param file - ملف الصورة
 * @param size - حجم الدائرة
 * @returns الصورة المقصوصة
 */
export async function cropToCircle(file: File, size: number = 300): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;

      if (ctx) {
        // إنشاء قناع دائري
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        // رسم الصورة
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedFile = new File([blob], file.name, {
              type: 'image/png',
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          } else {
            reject(new Error('فشل في قص الصورة'));
          }
        },
        'image/png'
      );
    };

    img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * تنسيق حجم الملف للعرض
 * @param bytes - حجم الملف بالبايت
 * @returns حجم الملف منسق
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * إنشاء اسم ملف فريد
 * @param originalName - الاسم الأصلي
 * @param prefix - بادئة اختيارية
 * @returns اسم الملف الجديد
 */
export function generateUniqueFilename(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  
  return `${prefix}${timestamp}_${random}.${extension}`;
}