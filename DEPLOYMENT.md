# دليل نشر المشروع داخل الشركة (Production)

## المتطلبات
- Node.js الإصدار LTS (يفضل 18 أو 20) و npm.
- قاعدة بيانات (PostgreSQL) مع قيمة `DATABASE_URL` صحيحة.
- صلاحيات كتابة للمجلد `public/uploads` على السيرفر.
- أداة تشغيل خدمة: PM2 (ويندوز/لينكس) أو بديل مثل NSSM على ويندوز، أو systemd على لينكس.

## تهيئة البيئة (Environment)
أنشئ ملف `.env.production` في جذر المشروع، وضع القيم التالية:

```
NODE_ENV=production
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB
JWT_SECRET=غيّر_هذه_القيمة_لسر_قوي
STORAGE_PROVIDER=local
IMAGE_UPLOAD_DIR=public/uploads/guests
NEXT_PUBLIC_BASE_URL=https://your-company-hostname
```

> ملاحظة: إذا أردت استخدام Cloudinary لاحقًا، أضف مفاتيح Cloudinary واضبط `STORAGE_PROVIDER=cloudinary`. لكن للنشر المحلي يكفي الإعداد أعلاه.

## تجهيز مجلد الرفع المحلي
- تأكد من وجود المجلد `public/uploads` داخل المشروع.
- امنحه صلاحية كتابة للحساب الذي يشغل التطبيق (على ويندوز: تأكد أن الخدمة تعمل بحساب لديه صلاحية الكتابة؛ على لينكس: استخدم `chown`/`chmod` حسب الحاجة).

## تثبيت الاعتمادات وبناء الإنتاج
```
npm ci
npm run build
```

## تشغيل التطبيق في الإنتاج

### ويندوز باستخدام PM2
```
npx pm2 start "npm start" --name "qrcode-app"
npx pm2 save
npx pm2 startup
```
- بعد تشغيل الأمر `pm2 startup` اتبع التعليمات التي يعرضها لإتمام التشغيل التلقائي بعد إعادة التشغيل.
- لعرض السجلات: `pm2 logs qrcode-app`.

### لينكس باستخدام PM2
```
npx pm2 start "npm start" --name "qrcode-app"
npx pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <username> --hp /home/<username>
```
- غيّر `<username>` للمستخدم الذي يشغل التطبيق.

### بديل: Nginx عكسـي (Reverse Proxy)
استخدم Nginx لتوجيه الطلبات إلى التطبيق على منفذ 3000:

```
server {
  listen 80;
  server_name your-company-hostname;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## التحقق بعد النشر
- افتح `https://your-company-hostname/` وتأكد من عمل التطبيق.
- أنشئ جيست جديد مع صورة.
- تحقق أن الـ API تُرجع `profileImagePath` و `thumbnailImagePath` غير فارغين.
- افحص ظهور صورة الجيست على الكارت فورًا.
- إن لم تظهر:
  - تأكد من أن `STORAGE_PROVIDER=local` في `.env.production`.
  - تأكد من أن `public/uploads` قابلة للكتابة وأنه يتم إنشاء مجلد `public/uploads/guests/...` بعد إنشاء جيست.
  - راجع السجلات: `pm2 logs qrcode-app` وابحث عن أخطاء رفع الصور.

## نسخ احتياطي وتنظيف
- قم بعمل نسخ احتياطي دوري لمجلد `public/uploads` لأنه يحتوي صور الجيست.
- راقب حجم القرص ونظف الصور غير المستخدمة عند الحاجة.