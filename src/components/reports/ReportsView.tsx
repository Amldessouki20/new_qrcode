'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  BarChart3, 
 
  TrendingUp,
  Users,
  Building2,
  CreditCard,
  Activity
} from 'lucide-react';

interface ReportData {
  id: string;
  type: 'scan' | 'user' | 'guest' | 'restaurant' | 'card'|'accommodation';
  title: string;
  description: string;
  data: Record<string, unknown>;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
}

interface ReportsViewProps {
  initialReports?: ReportData[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ initialReports = [] }) => {
  const t = useTranslations('reports');
  const [reports, setReports] = useState<ReportData[]>(initialReports);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('type', selectedType);
      if (dateRange.start) {
        params.append('startDate', dateRange.start);
      }
      if (dateRange.end) {
        params.append('endDate', dateRange.end);
      }
      const response = await fetch(`/api/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, dateRange]);

  useEffect(() => {
    if (initialReports.length === 0) {
      fetchReports();
    }
  }, [selectedType, dateRange, initialReports.length, fetchReports]);

  const generateReport = async (type: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          period: dateRange
        })
      });
      
      if (response.ok) {
        const newReport = await response.json();
        setReports(prev => [newReport, ...prev]);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportId: string, format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const reportTypes = [
    { value: 'scan', label: t('types.scan'), icon: Activity },
    { value: 'user', label: t('types.user'), icon: Users },
    { value: 'guest', label: t('types.guest'), icon: Users },
    { value: 'restaurant', label: t('types.restaurant'), icon: Building2 },
    { value: 'card', label: t('types.card'), icon: CreditCard },
    { value: 'accommodation', label: t('types.accommodation'), icon: Building2 }
  ];

  const getReportIcon = (type: string) => {
    const reportType = reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.icon : FileText;
  };

  const filteredReports = selectedType === 'all' 
    ? reports 
    : reports.filter(report => report.type === selectedType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => fetchReports()}>
            <TrendingUp className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalReports')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.thisMonth')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => 
                new Date(r.generatedAt).getMonth() === new Date().getMonth()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.scanReports')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.type === 'scan').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.userReports')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.type === 'user').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Generate */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('filters.type')}</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
                  {reportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('filters.startDate')}</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">{t('filters.endDate')}</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => fetchReports()} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                {t('filter')}
              </Button>
            </div>
            <div className="flex items-end">
              <Select onValueChange={(type) => generateReport(type)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('generateReport')} />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">{t('loading')}</p>
            </CardContent>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('noReports')}</h3>
              <p className="text-muted-foreground mb-4">{t('noReportsDescription')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => {
            const Icon = getReportIcon(report.type);
            return (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {reportTypes.find(rt => rt.value === report.type)?.label}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report.id, 'pdf')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report.id, 'excel')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{t('period')}:</span>
                      <p className="text-muted-foreground">
                        {new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">{t('generatedAt')}:</span>
                      <p className="text-muted-foreground">
                        {new Date(report.generatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">{t('dataPoints')}:</span>
                      <p className="text-muted-foreground">
                        {Array.isArray(report.data) ? report.data.length : Object.keys(report.data || {}).length} {t('entries')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReportsView;