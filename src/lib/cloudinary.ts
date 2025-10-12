import { v2 as cloudinary } from 'cloudinary';

// إعداد Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  eager?: Array<{
    secure_url: string;
    width: number;
    height: number;
    format: string;
  }>;
}

export interface ImageUploadOptions {
  folder?: string;
  transformation?: Record<string, unknown>[];
  quality?: string | number;
  format?: string;
}

/**
 * رفع صورة إلى Cloudinary
 * @param file - ملف الصورة (Buffer أو base64 string)
 * @param options - خيارات الرفع
 * @returns معلومات الصورة المرفوعة
 */
export async function uploadImage(
  file: Buffer | string,
  options: ImageUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions = {
      folder: options.folder || 'guest-profiles',
      transformation: options.transformation || [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ],
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      ...options
    };

    const result = await cloudinary.uploader.upload(
      file instanceof Buffer ? `data:image/jpeg;base64,${file.toString('base64')}` : file as string,
      uploadOptions
    );

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  } catch (error) {
    console.error('خطأ في رفع الصورة إلى Cloudinary:', error);
    throw new Error('فشل في رفع الصورة');
  }
}

/**
 * حذف صورة من Cloudinary
 * @param publicId - معرف الصورة العام
 * @returns نتيجة الحذف
 */
export async function deleteImage(publicId: string): Promise<{ result: string }> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('خطأ في حذف الصورة من Cloudinary:', error);
    throw new Error('فشل في حذف الصورة');
  }
}

/**
 * إنشاء صورة مصغرة
 * @param publicId - معرف الصورة العام
 * @param width - العرض المطلوب
 * @param height - الارتفاع المطلوب
 * @returns رابط الصورة المصغرة
 */
export function generateThumbnail(
  publicId: string,
  width: number = 150,
  height: number = 150
): string {
  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
      { format: 'webp' }
    ]
  });
}

/**
 * التحقق من صحة الصورة
 * @param file - ملف الصورة
 * @returns true إذا كانت الصورة صحيحة
 */
export function validateImage(file: File): { isValid: boolean; error?: string } {
  // التحقق من نوع الملف
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP'
    };
  }

  // التحقق من حجم الملف (2MB كحد أقصى)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'حجم الملف كبير جداً. يجب أن يكون أقل من 2 ميجابايت'
    };
  }

  return { isValid: true };
}

/**
 * الحصول على رابط الصورة المحسن
 * @param publicId - معرف الصورة العام
 * @param options - خيارات التحسين
 * @returns رابط الصورة المحسن
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  } = {}
): string {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options.width || 300,
        height: options.height || 300,
        crop: 'fill',
        gravity: 'face'
      },
      {
        quality: options.quality || 'auto:good',
        format: options.format || 'webp'
      }
    ]
  });
}

/**
 * رفع صورة من URL
 * @param imageUrl - رابط الصورة
 * @param options - خيارات الرفع
 * @returns معلومات الصورة المرفوعة
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  options: ImageUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions = {
      folder: options.folder || 'guest-profiles',
      transformation: options.transformation || [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ],
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      ...options
    };

    const result = await cloudinary.uploader.upload(imageUrl, uploadOptions);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  } catch (error) {
    console.error('خطأ في رفع الصورة من URL:', error);
    throw new Error('فشل في رفع الصورة من الرابط');
  }
}

export default cloudinary;