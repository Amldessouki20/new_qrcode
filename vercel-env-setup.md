# متغيرات البيئة المطلوبة في Vercel

## خطوات إضافة متغيرات البيئة في Vercel:

1. اذهب إلى: https://vercel.com/dashboard
2. اختر مشروع: new-qrcode-olive
3. اذهب إلى Settings → Environment Variables
4. أضف المتغيرات التالية:

## المتغيرات المطلوبة:

### قاعدة البيانات (Database)
```
DATABASE_URL=postgresql://postgres:ugHlKmUF92UdZf2Y@db.uiwyehiyapdgbhzahgbu.supabase.co:5432/postgres
POSTGRES_URL_NON_POOLING=postgresql://postgres:ugHlKmUF92UdZf2Y@db.uiwyehiyapdgbhzahgbu.supabase.co:5432/postgres
```

### JWT Configuration
```
JWT_SECRET=1234567890
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=super123456
JWT_REFRESH_EXPIRES_IN=30d
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://uiwyehiyapdgbhzahgbu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpd3llaGl5YXBkZ2JoemFoZ2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTg5MzIsImV4cCI6MjA3NDczNDkzMn0.n6n_F_R_XpTN-HY7hTw1IHRkztleMvvvnFfFxChMgIo
```

## ملاحظات مهمة:

1. **POSTGRES_URL_NON_POOLING** هو المتغير المستخدم في schema.prisma
2. تأكد من إضافة جميع المتغيرات للبيئات: Production, Preview, Development
3. بعد إضافة المتغيرات، قم بإعادة نشر المشروع (Redeploy)

## خطوات إعادة النشر:
1. اذهب إلى Deployments tab
2. اختر آخر deployment
3. اضغط على "Redeploy"
4. أو ادفع commit جديد إلى Git

## اختبار بعد إعادة النشر:
- اختبر endpoint: https://new-qrcode-olive.vercel.app/api/test-db
- اختبر تسجيل الدخول: https://new-qrcode-olive.vercel.app/api/auth/login