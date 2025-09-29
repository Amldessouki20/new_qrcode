'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { 
  PowerOff, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  Wifi,
  WifiOff,
  Shield,
  Unlock,
  Lock,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface GateControlPanelProps {
  gateId: string;
  gateName: string;
  gateType: 'MAIN' | 'RESTAURANT';
  protocol: 'TCP_IP' | 'RS485' | 'HTTP';
  isActive: boolean;
  onStatusChange?: () => void;
}

interface ControlResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export function GateControlPanel({ 
  gateId, 
  gateName, 
  gateType, 
  protocol, 
  isActive,
  onStatusChange 
}: GateControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ControlResponse | null>(null);
  const [duration, setDuration] = useState(5);
  const [reason, setReason] = useState('');
  const [gateStatus, setGateStatus] = useState<'OPEN' | 'CLOSED' | 'UNKNOWN'>('UNKNOWN');
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');

  const controlGate = useCallback(async (action: string, customDuration?: number, customReason?: string): Promise<ControlResponse> => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/gates/${gateId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          duration: customDuration || duration,
          reason: customReason || reason || `${action} من لوحة التحكم`
        }),
      });

      const result = await response.json();
      setLastResponse(result);

      if (result.success) {
        toast.success(result.message, {
          duration: 5000,
        });
        
        // Update local status
        if (action === 'OPEN') {
          setGateStatus('OPEN');
        } else if (action === 'CLOSE') {
          setGateStatus('CLOSED');
        }
        
        if (onStatusChange) {
          onStatusChange();
        }
      } else {
        toast.error(result.message || 'فشل في تنفيذ العملية');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في الاتصال';
      const errorResult = { success: false, message: errorMessage };
      setLastResponse(errorResult);
      toast.error(errorMessage);
      return errorResult;
    } finally {
      setLoading(false);
    }
  }, [gateId, duration, reason, onStatusChange]);

  const checkGateStatus = useCallback(async () => {
    try {
      setConnectionStatus('CHECKING');
      const response = await controlGate('STATUS');
      
      if (response.success) {
        setConnectionStatus('ONLINE');
        const status = response.data?.status as string;
        setGateStatus((status === 'OPEN' || status === 'CLOSED') ? status : 'UNKNOWN');
      } else {
        setConnectionStatus('OFFLINE');
      }
    } catch {
      setConnectionStatus('OFFLINE');
    }
  }, [controlGate]);

  useEffect(() => {
    checkGateStatus();
    const interval = setInterval(checkGateStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkGateStatus]);

  const handleOpenGate = () => controlGate('OPEN', duration, reason);
  const handleCloseGate = () => controlGate('CLOSE', undefined, reason);
  const handleResetGate = () => controlGate('RESET', undefined, reason);
  const handleEmergencyOpen = () => {
    if (confirm('هل أنت متأكد من فتح البوابة في وضع الطوارئ؟')) {
      controlGate('EMERGENCY_OPEN', undefined, 'فتح طوارئ من لوحة التحكم');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-green-600 bg-green-100';
      case 'CLOSED': return 'text-blue-600 bg-blue-100';
      case 'ONLINE': return 'text-green-600';
      case 'OFFLINE': return 'text-red-600';
      case 'CHECKING': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'ONLINE': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'OFFLINE': return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'CHECKING': return <Activity className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PowerOff className="h-5 w-5 text-gray-500" />
            لوحة التحكم - {gateName}
          </CardTitle>
          <CardDescription>البوابة غير نشطة حالياً</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              يجب تفعيل البوابة أولاً لاستخدام لوحة التحكم
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              لوحة التحكم - {gateName}
            </div>
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <span className={`text-sm ${getStatusColor(connectionStatus)}`}>
                {connectionStatus === 'ONLINE' ? 'متصل' : 
                 connectionStatus === 'OFFLINE' ? 'غير متصل' : 'جاري الفحص...'}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            {gateType === 'MAIN' ? 'البوابة الرئيسية' : 'بوابة المطعم'} - {protocol}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {gateStatus === 'OPEN' ? (
                <Unlock className="h-6 w-6 text-green-600" />
              ) : (
                <Lock className="h-6 w-6 text-blue-600" />
              )}
              <div>
                <div className="font-medium">حالة البوابة</div>
                <Badge className={getStatusColor(gateStatus)}>
                  {gateStatus === 'OPEN' ? 'مفتوحة' : 
                   gateStatus === 'CLOSED' ? 'مغلقة' : 'غير معروف'}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkGateStatus}
              disabled={loading}
            >
              <Activity className="h-4 w-4 mr-2" />
              تحديث الحالة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Control Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات التحكم</CardTitle>
          <CardDescription>تخصيص معاملات التحكم في البوابة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">مدة الفتح (ثانية)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="60"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">سبب العملية (اختياري)</Label>
              <Input
                id="reason"
                placeholder="مثال: دخول ضيف VIP"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>أوامر التحكم</CardTitle>
          <CardDescription>تحكم مباشر في البوابة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={handleOpenGate}
              disabled={loading || connectionStatus === 'OFFLINE'}
              className="flex flex-col items-center gap-2 h-20"
              variant="outline"
            >
              <Unlock className="h-6 w-6 text-green-600" />
              <span>فتح البوابة</span>
            </Button>

            <Button
              onClick={handleCloseGate}
              disabled={loading || connectionStatus === 'OFFLINE'}
              className="flex flex-col items-center gap-2 h-20"
              variant="outline"
            >
              <Lock className="h-6 w-6 text-blue-600" />
              <span>إغلاق البوابة</span>
            </Button>

            <Button
              onClick={handleResetGate}
              disabled={loading || connectionStatus === 'OFFLINE'}
              className="flex flex-col items-center gap-2 h-20"
              variant="outline"
            >
              <RotateCcw className="h-6 w-6 text-orange-600" />
              <span>إعادة تعيين</span>
            </Button>

            <Button
              onClick={handleEmergencyOpen}
              disabled={loading || connectionStatus === 'OFFLINE'}
              className="flex flex-col items-center gap-2 h-20"
              variant="destructive"
            >
              <Shield className="h-6 w-6" />
              <span>فتح طوارئ</span>
            </Button>
          </div>

          {loading && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>جاري تنفيذ العملية...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Response */}
      {lastResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResponse.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              آخر استجابة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={lastResponse.success ? 'default' : 'destructive'}>
              <AlertDescription>{lastResponse.message}</AlertDescription>
            </Alert>
            
            {lastResponse.data && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <pre className="text-sm text-gray-600 overflow-x-auto">
                  {JSON.stringify(lastResponse.data, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleString('ar-SA')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
