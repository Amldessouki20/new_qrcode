"use client";

import { useState } from 'react';
import ManualScanForm from '@/components/accommodation/ManualScanForm';
import AccommodationScanTable from '@/components/accommodation/AccommodationScanTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Scan } from 'lucide-react';

interface ManualScanShellProps {
  locale: string;
}

export default function ManualScanShell({ locale }: ManualScanShellProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScanComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
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
                <li>سيتم تحديث الجدول تلقائيًا</li>
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
            <AccommodationScanTable locale={locale} refreshKey={refreshKey} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}