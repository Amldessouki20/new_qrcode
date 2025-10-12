'use client';

import { useState } from 'react';
// import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManualScanForm from '@/components/accommodation/ManualScanForm';
import AccommodationScanTable from '@/components/accommodation/AccommodationScanTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TestTube, Scan, Table, AlertTriangle } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ManualScanPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [refreshKey, setRefreshKey] = useState(0);

  // Mock user for client-side rendering
  const mockUser = {
    id: 'temp-user',
    username: 'Manual Scan User',
    role: 'ADMIN' as const
  };

  const handleScanComplete = () => {
    // Increment refresh key to trigger table refresh
    setRefreshKey(prev => prev + 1);
  };

  return (
    <DashboardLayout user={mockUser}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-3">
            <TestTube className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                صفحة المسح اليدوي المؤقتة
              </h1>
              <p className="text-muted-foreground">
                اختبار رسائل النجاح والخطأ عن طريق إدخال QR Code يدوياً
              </p>
            </div>
          </div>
          
          {/* Warning Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              صفحة مؤقتة للاختبار
            </Badge>
            <span className="text-sm text-muted-foreground">
              هذه الصفحة مخصصة للاختبار فقط ويمكن حذفها لاحقاً
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Scan Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="w-5 h-5" />
                  نموذج المسح اليدوي
                </CardTitle>
                <CardDescription>
                  أدخل بيانات البطاقة أو QR Code لاختبار النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManualScanForm onScanComplete={handleScanComplete} />
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تعليمات الاستخدام</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>1. إدخال البيانات:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                    <li>أدخل رقم البطاقة مباشرة (مثل: CARD123)</li>
                    <li>أو أدخل QR Code بصيغة JSON</li>
                    <li>أو أدخل أي نص لاختبار حالة &quot;البطاقة غير موجودة&quot;</li>
                  </ul>
                  
                  <p><strong>2. مراقبة النتائج:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                    <li>ستظهر رسالة Toast فورية</li>
                    <li>ستظهر تفاصيل النتيجة أسفل النموذج</li>
                    <li>سيتم تحديث الجدول تلقائياً</li>
                  </ul>

                  <p><strong>3. حالات الاختبار:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                    <li>بطاقة صحيحة ونشطة → نجح</li>
                    <li>بطاقة غير موجودة → فشل</li>
                    <li>بطاقة منتهية الصلاحية → فشل</li>
                    <li>تجاوز حد الاستخدام → تحذير</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scan Results Table */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  نتائج المسح المباشرة
                </CardTitle>
                <CardDescription>
                  جدول يعرض نتائج المسح مع التحديث التلقائي
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccommodationScanTable 
                  locale={locale} 
                   refreshKey={refreshKey}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Development Notes */}
        {/* <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">
              ملاحظات التطوير
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>المكونات المنشأة:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>/api/accommodation/manual-scan</code> - API route للمسح اليدوي</li>
                <li><code>ManualScanForm</code> - نموذج المسح مع Toast notifications</li>
                <li><code>AccommodationScanTable</code> - جدول محدث بدعم refreshKey</li>
                <li>صفحة التكامل هذه مع نظام التحديث التلقائي</li>
              </ul>
              
              <p className="mt-4"><strong>الميزات المتاحة:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>مسح يدوي مع معالجة شاملة للأخطاء</li>
                <li>إشعارات Toast فورية</li>
                <li>عرض تفصيلي لنتائج المسح</li>
                <li>تحديث تلقائي للجدول</li>
                <li>دعم اللغة العربية والإنجليزية</li>
              </ul>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </DashboardLayout>
  );
}