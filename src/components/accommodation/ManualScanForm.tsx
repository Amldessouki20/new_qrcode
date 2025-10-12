'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Scan, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  CreditCard,
  Building,
  Calendar,
  Hash
} from 'lucide-react';

interface ManualScanFormProps {
  onScanComplete?: () => void;
}

interface ScanResult {
  success: boolean;
  scanId: string;
  message: string;
  messageAr: string;
  errorCode?: string;
  card?: {
    id: string;
    cardData: string;
    usageCount: number;
    maxUsage?: number;
    validFrom?: string;
    validTo?: string;
    isActive: boolean;
  };
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    roomNumber?: string;
    company?: string;
    checkInDate?: string;
    expiredDate?: string;
    isActive: boolean;
  };
  restaurant?: {
    id: string;
    name: string;
    nameAr?: string;
  };
  timestamp: string;
}

export default function ManualScanForm({ onScanComplete }: ManualScanFormProps) {
  const [cardData, setCardData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardData.trim()) {
      toast.error('يرجى إدخال بيانات البطاقة', {
        description: 'Please enter card data'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/accommodation/manual-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardData: cardData.trim(),
          scanType: 'QR'
        }),
      });

      const result: ScanResult = await response.json();

      if (response.ok) {
        setLastScanResult(result);
        
        if (result.success) {
          toast.success('تم المسح بنجاح!', {
            description: result.messageAr || result.message,
            duration: 4000,
          });
        } else {
          toast.error('فشل في المسح', {
            description: result.messageAr || result.message,
            duration: 5000,
          });
        }
        
        // Clear the input after successful scan
        if (result.success) {
          setCardData('');
        }
        
        // Notify parent component to refresh
        onScanComplete?.();
        
      } else {
        toast.error('خطأ في الخادم', {
          description: result.message || 'Server error occurred'
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('خطأ في الاتصال', {
        description: 'Network connection error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (success: boolean, errorCode?: string) => {
    if (success) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          نجح
        </Badge>
      );
    }
    
    const isWarning = errorCode === 'MEAL_LIMIT_EXCEEDED' || errorCode === 'CARD_EXPIRED';
    
    return (
      <Badge variant={isWarning ? "secondary" : "destructive"} 
             className={isWarning ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}>
        {isWarning ? (
          <AlertTriangle className="w-3 h-3 mr-1" />
        ) : (
          <XCircle className="w-3 h-3 mr-1" />
        )}
        {isWarning ? 'تحذير' : 'فشل'}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Manual Scan Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            مسح يدوي للبطاقات
          </CardTitle>
          <CardDescription>
            أدخل بيانات البطاقة أو QR Code للاختبار اليدوي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="cardData" className="text-sm font-medium">
                بيانات البطاقة / QR Code
              </label>
              <Input
                id="cardData"
                type="text"
                value={cardData}
                onChange={(e) => setCardData(e.target.value)}
                placeholder="أدخل رقم البطاقة أو QR Code..."
                disabled={isLoading}
                className="font-mono"
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading || !cardData.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري المسح...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4 mr-2" />
                  مسح البطاقة
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Last Scan Result */}
      {lastScanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>نتيجة آخر مسح</span>
              {getStatusBadge(lastScanResult.success, lastScanResult.errorCode)}
            </CardTitle>
            <CardDescription>
              {formatDate(lastScanResult.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scan Message */}
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-900">
                {lastScanResult.messageAr}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {lastScanResult.message}
              </p>
              {lastScanResult.errorCode && (
                <p className="text-xs text-red-600 mt-1">
                  كود الخطأ: {lastScanResult.errorCode}
                </p>
              )}
            </div>

            {/* Card Information */}
            {lastScanResult.card && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    معلومات البطاقة
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">رقم البطاقة:</span>
                      <p className="font-mono">{lastScanResult.card.cardData}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">الحالة:</span>
                      <p className={lastScanResult.card.isActive ? 'text-green-600' : 'text-red-600'}>
                        {lastScanResult.card.isActive ? 'نشطة' : 'غير نشطة'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">عدد الاستخدامات:</span>
                      <p>
                        {lastScanResult.card.usageCount}
                        {lastScanResult.card.maxUsage && ` / ${lastScanResult.card.maxUsage}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">صالحة حتى:</span>
                      <p>{formatDate(lastScanResult.card.validTo)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Guest Information */}
            {lastScanResult.guest && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    معلومات الضيف
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">الاسم:</span>
                      <p>{lastScanResult.guest.firstName} {lastScanResult.guest.lastName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">رقم الغرفة:</span>
                      <p className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {lastScanResult.guest.roomNumber || 'غير محدد'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">الشركة:</span>
                      <p className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {lastScanResult.guest.company || 'غير محدد'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">تاريخ المغادرة:</span>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(lastScanResult.guest.expiredDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Restaurant Information */}
            {lastScanResult.restaurant && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    معلومات المطعم
                  </h4>
                  <div className="text-sm">
                    <p>{lastScanResult.restaurant.nameAr || lastScanResult.restaurant.name}</p>
                    {lastScanResult.restaurant.nameAr && (
                      <p className="text-gray-600">{lastScanResult.restaurant.name}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}