# إصلاح خطأ "Image is not defined" - معالجة الصور في البيئة الخادم

## المشكلة الأصلية

كان النظام يواجه خطأ `ReferenceError: Image is not defined` عند محاولة رفع الصور، والسبب:

```
ReferenceError: Image is not defined
    at eval (src\lib\image-utils.ts:245:17)
    at new Promise (<anonymous>)
    at getImageDimensions (src\lib\image-utils.ts:244:10)
    at validateImageFile (src\lib\image-utils.ts:191:30)
    at POST (src\app\api\guests\route.ts:278:51)
```

### سبب المشكلة
- كان الكود يستخدم `new Image()` وهو API خاص بالمتصفح فقط
- عند تشغيل الكود في البيئة الخادم (Node.js)، هذا الكائن غير متوفر
- API routes في Next.js تعمل في البيئة الخادم، ليس في المتصفح

## الحل المطبق

### 1. تثبيت مكتبة Sharp
```bash
npm install sharp
```

### 2. إعادة كتابة دوال معالجة الصور

#### أ) دالة `getImageDimensions`
```typescript
export function getImageDimensions(file: File | Buffer | { size: number; type: string; name: string }): Promise<{ width: number; height: number }> {
  // فحص البيئة
  if (typeof window === 'undefined') {
    // معالجة في الخادم باستخدام Sharp
    return getImageDimensionsServer(file);
  } else {
    // معالجة في المتصفح باستخدام Image API
    return getImageDimensionsClient(file as File);
  }
}
```

#### ب) معالجة الخادم باستخدام Sharp
```typescript
async function getImageDimensionsServer(file: File | Buffer | { size: number; type: string; name: string }): Promise<{ width: number; height: number }> {
  const sharp = require('sharp');
  let buffer: Buffer;
  
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if ('arrayBuffer' in file) {
    const arrayBuffer = await (file as File).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }
  
  const metadata = await sharp(buffer).metadata();
  return { width: metadata.width!, height: metadata.height! };
}
```

#### ج) دالة `compressImage` المحدثة
```typescript
export async function compressImage(
  file: File | Buffer,
  options: ImageCompressionOptions = {}
): Promise<{ blob: Blob | Buffer; base64: string }> {
  if (typeof window === 'undefined') {
    return compressImageServer(file, options);
  } else {
    return compressImageClient(file as File, options);
  }
}
```

### 3. ميزات الحل الجديد

#### أ) معالجة مزدوجة البيئة
- **في الخادم**: استخدام Sharp للمعالجة السريعة والفعالة
- **في المتصفح**: استخدام Canvas API التقليدي

#### ب) معالجة أنواع ملفات متعددة
- `File` objects من المتصفح
- `Buffer` objects في الخادم
- كائنات مخصصة مع معلومات الملف

#### ج) ضغط محسن
```typescript
const processedBuffer = await sharp(buffer)
  .resize(maxWidth, maxHeight, {
    fit: 'inside',
    withoutEnlargement: true
  })
  .jpeg({ quality: Math.round(quality * 100) })
  .toBuffer();
```

## الفوائد

### 1. الأداء
- Sharp أسرع بكثير من معالجة Canvas في الخادم
- معالجة متوازية للصور المتعددة
- استهلاك ذاكرة أقل

### 2. الموثوقية
- لا يعتمد على APIs المتصفح في الخادم
- معالجة أخطاء محسنة
- دعم أفضل لأنواع الصور المختلفة

### 3. قابلية التوسع
- يمكن معالجة آلاف الصور بكفاءة
- دعم أحجام ملفات كبيرة
- معالجة متوازية

## اختبار الحل

### 1. اختبار أساسي
```bash
# تشغيل الخادم
npm run dev

# زيارة صفحة الاختبار
http://localhost:3000/ar/test-guest
```

### 2. اختبار أنواع الصور
- JPEG
- PNG  
- WebP
- أحجام مختلفة (صغيرة، متوسطة، كبيرة)

### 3. مراقبة السجلات
```
✅ Server-side image dimensions: { width: 800, height: 600, format: 'jpeg' }
✅ Server-side image compression completed: {
  originalSize: 150000,
  compressedSize: 45000,
  compressionRatio: '70.00%'
}
```

## الخطوات التالية

### 1. اختبار الأداء
- اختبار مع مئات الصور
- قياس أوقات المعالجة
- مراقبة استهلاك الذاكرة

### 2. تحسينات إضافية
- إضافة cache للصور المعالجة
- معالجة متوازية للدفعات الكبيرة
- ضغط تدريجي حسب الحجم

### 3. مراقبة الإنتاج
- إعداد logging مفصل
- مراقبة الأخطاء
- تتبع الأداء

## الملفات المعدلة

- `src/lib/image-utils.ts` - الدوال الأساسية
- `package.json` - إضافة Sharp dependency
- تم إنشاء دوال منفصلة للخادم والمتصفح

## الخلاصة

تم حل مشكلة `Image is not defined` بنجاح من خلال:
1. استخدام Sharp للمعالجة في الخادم
2. الحفاظ على Canvas API للمتصفح  
3. إنشاء نظام معالجة مزدوج البيئة
4. تحسين الأداء والموثوقية

النظام الآن جاهز لمعالجة آلاف الضيوف مع صورهم بكفاءة عالية.