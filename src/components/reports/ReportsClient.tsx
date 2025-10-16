'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
//

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

interface ExportFormat {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface ReportsClientProps {
  reportTypes: ReportType[];
  exportFormats: ExportFormat[];
  locale: string;
}

type RecentReport = { name: string; date: Date; format: string; size: string };

export function ReportsClient({ reportTypes, exportFormats, locale }: ReportsClientProps) {
  const t = useTranslations();
  const [selectedReportType, setSelectedReportType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  type Period = 'daily' | 'weekly' | 'monthly' | 'custom';
  const [period, setPeriod] = useState<Period>('daily');

  // Removed editable header metadata; headers will be injected server-side statically

  // Locale-safe date formatter to avoid hydration mismatch (explicit locale + UTC)
  const normalizedLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : (locale || 'en-US');
  const formatDate = (value: Date | string) => {
    const d = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat(normalizedLocale, {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC'
    }).format(d);
  };

  // Recent reports rendered after mount to prevent SSR/client time differences
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  useEffect(() => {
    setRecentReports([
      { name: 'Users Report', date: new Date(), format: 'PDF', size: '2.3 MB' },
      { name: 'Cards Report', date: new Date(Date.now() - 86400000), format: 'Excel', size: '1.8 MB' },
      { name: 'Scan Logs Report', date: new Date(Date.now() - 172800000), format: 'Word', size: '3.1 MB' }
    ]);
  }, []);

  // Removed local header derivations; kept only report selection and dates

  const handleExport = (reportId: string, format: string) => {
    const params = new URLSearchParams({
      format,
      period
    });
    if (period === 'custom') {
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
    }
    window.open(`/api/reports/${reportId}/export?${params.toString()}`, '_blank');
  };

  const handleCustomReport = () => {
    if (!selectedReportType || !selectedFormat) {
      alert('Please select both report type and format');
      return;
    }
    
    const params = new URLSearchParams({
      format: selectedFormat,
      period
    });
    if (period === 'custom') {
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
    }
    
    window.open(`/api/reports/${selectedReportType}/export?${params.toString()}`, '_blank');
  };

  return (
    <>
      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.title')}</CardTitle> 
           {/* ترويسة التقارير ستظهر فقط داخل الملفات المُصدّرة */}

        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {report.icon}
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {report.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold text-${report.color}-600`}>
                      {report.count}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t('reports.selectFormat')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {exportFormats.map((format) => (
                        <Button
                          key={format.id}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2 justify-start"
                          onClick={() => handleExport(report.id, format.id)}
                        >
                          {format.icon}
                          <span>{format.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Report Generator (بدون حقول الهيدر) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.custom.title')}</CardTitle>
          <CardDescription>
            {t('reports.custom.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* تمت إزالة حقول الهيدر؛ نُبقي فقط التواريخ ونوع التقرير والصيغة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {locale === 'ar' ? 'الفترة' : 'Period'}
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                >
                  <option value="daily">{locale === 'ar' ? 'يومي' : 'Daily'}</option>
                  <option value="weekly">{locale === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
                  <option value="monthly">{locale === 'ar' ? 'شهري' : 'Monthly'}</option>
                  <option value="custom">{locale === 'ar' ? 'مخصص' : 'Custom'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('reports.custom.from')}
                </label>
                <Input 
                  type="date" 
                  className="w-full" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={period !== 'custom'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('reports.custom.to')}
                </label>
                <Input 
                  type="date" 
                  className="w-full" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={period !== 'custom'}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('reports.custom.reportType')}
              </label>
              <select 
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
              >
                <option value="">{t('reports.custom.selectType')}</option>
                {reportTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('reports.custom.format')}
              </label>
              <div className="flex space-x-2">
                {exportFormats.map((format) => (
                  <Button
                    key={format.id}
                    variant={selectedFormat === format.id ? "default" : "outline"}
                    size="sm"
                    className="flex items-center space-x-2"
                    onClick={() => setSelectedFormat(format.id)}
                  >
                    {format.icon}
                    <span>{format.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button 
                className="flex items-center space-x-2"
                onClick={handleCustomReport}
              >
                <Download className="h-4 w-4" />
                <span>{t('reports.custom.generate')}</span>
              </Button>
              <Button variant="outline">
                {t('reports.custom.preview')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.recent.title')}</CardTitle>
          <CardDescription>
            {t('reports.recent.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Recent reports (client-rendered) */}
            {recentReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(report.date)} • {report.format} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
