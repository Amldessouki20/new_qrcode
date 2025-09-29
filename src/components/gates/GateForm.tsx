'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Cable, 
  Globe, 
  Settings, 
  Network,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

const createGateFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("gates.new.form.validation.nameRequired")),
  nameAr: z.string().min(1, t("gates.new.form.validation.nameArRequired")),
  typeId: z.string().optional(),
  gateType: z.string().min(1, t("gates.new.form.validation.gateTypeRequired")),
  gateTypeAr: z.string().min(1, t("gates.new.form.validation.gateTypeArRequired")),
  location: z.string().min(1, t("gates.new.form.validation.locationRequired")),
   defaultProtocolId: z.string().optional(),
   protocolName: z.string().optional(),
   protocolNameAr: z.string().optional(),
   ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, t("gates.new.form.validation.invalidIP")).optional().or(z.literal('')),
   port: z.coerce.number().min(1).max(65535, t("gates.new.form.validation.invalidPort")).optional(),
  serialPort: z.string().optional(),
  baudRate: z.coerce.number().optional(),
  model: z.string().optional(),
  maxCapacity: z.coerce.number().min(1).optional(),
  isActive: z.boolean(),
  description: z.string().optional(),
}).refine((data) => {
  // إذا لم يتم اختيار بروتوكول محدد أو تم اختيار "مخصص"، فيجب إدخال اسم البروتوكول
  if (!data.defaultProtocolId || data.defaultProtocolId === 'custom') {
    return data.protocolName && data.protocolName.length > 0;
  }
  return true;
}, {
  message: t("gates.new.form.validation.protocolNameRequired"),
  path: ["protocolName"]
});

interface GateProtocol {
  id: string;
  name: string;
}

interface Gate {
  id: string;
  name: string;
  nameAr: string;
  typeId?: string | undefined;
  gateType: string;
  gateTypeAr: string;
  location: string;
  defaultProtocolId?: string | undefined;
  protocolName?: string | undefined;
  protocolNameAr?: string | undefined;
  ipAddress?: string | undefined;
  port?: number | undefined;
  serialPort?: string | undefined;
  baudRate?: number | undefined;
  model?: string | undefined;
  maxCapacity?: number | undefined;
  isActive: boolean;
  description?: string | undefined;
}

interface GateFormProps {
  gate?: Gate;
  locale: string;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
}

export function GateForm({ gate, locale, onSuccess }: GateFormProps) {
  const t = useTranslations();
  const gateFormSchema = createGateFormSchema(t);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [gateProtocols, setGateProtocols] = useState<GateProtocol[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(gateFormSchema),
    defaultValues: {
      name: gate?.name ?? '',
      nameAr: gate?.nameAr ?? '',
      typeId: gate?.typeId ?? '',
      gateType: gate?.gateType ?? '',
      gateTypeAr: gate?.gateTypeAr ?? '',
      location: gate?.location ?? '',
      defaultProtocolId: gate?.defaultProtocolId ?? '',
      protocolName: gate?.protocolName ?? '',
      protocolNameAr: gate?.protocolNameAr ?? '',
      ipAddress: gate?.ipAddress ?? '',
      port: gate?.port ?? 80,
      serialPort: gate?.serialPort ?? '',
      baudRate: gate?.baudRate ?? 9600,
      model: gate?.model ?? 'ST-ST01',
      maxCapacity: gate?.maxCapacity ?? 30,
      isActive: gate?.isActive ?? true,
      description: gate?.description ?? '',
    }
  });


  const watchedProtocolId = watch('defaultProtocolId');

  // Fetch gate types and protocols
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesResponse, protocolsResponse] = await Promise.all([
          fetch('/api/gate-types', { credentials: 'include' }),
          fetch('/api/gate-protocols', { credentials: 'include' })
        ]);

        if (typesResponse.ok) {
          // Gate types data fetched but not currently used
        }

        if (protocolsResponse.ok) {
          const protocolsData = await protocolsResponse.json();
          setGateProtocols(protocolsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching gate data:', error);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: z.infer<typeof gateFormSchema>) => {
    setIsLoading(true);
    setError('');

    try {
      // Clean up data based on protocol
      const cleanData = { ...data };
      
      // Find selected protocol to determine what fields to clean
      const selectedProtocol = gateProtocols?.find(p => p.id === data.defaultProtocolId);
      
      // تنظيف الحقول بناءً على نوع البروتوكول
      const protocolName = selectedProtocol?.name || data.protocolName;
      
      if (protocolName !== 'TCP_IP' && protocolName !== 'HTTP') {
        cleanData.ipAddress = undefined;
        cleanData.port = undefined;
      }
      
      if (protocolName !== 'RS485') {
        cleanData.serialPort = undefined;
        cleanData.baudRate = undefined;
      }

      const url = gate ? `/api/gates/${gate.id}` : '/api/gates';
      const method = gate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(cleanData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'حدث خطأ غير متوقع');
      }

      toast.success(result.message || (gate ? 'تم تحديث البوابة بنجاح' : 'تم إنشاء البوابة بنجاح'), {
        duration: 5000,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/${locale}/gates`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'TCP_IP': return <Network className="h-4 w-4" />;
      case 'RS485': return <Cable className="h-4 w-4" />;
      case 'HTTP': return <Globe className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };



  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* <div className="flex items-center gap-2"> */}
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button> */}
          {/* <div> */}
            {/* <h1 className="text-2xl font-bold">
              {gate ? 'تعديل البوابة' : 'إضافة بوابة جديدة'}
            </h1> */}
            {/* <p className="text-muted-foreground">
              {gate ? 'تحديث معلومات البوابة' : 'إنشاء بوابة جديدة لإدارة الدخول'}
            </p> */}
          {/* </div> */}
        {/* </div> */}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Information */}
        <Card className='bg-slate-50'>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
             BasicInfo
            </CardTitle>
            <CardDescription>
             add basic info
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("gates.name")} </Label>
                <Input className="h-8 text-sm px-2 max-w-xs"
                  id="name"
                  {...register('name')}
                  placeholder={t("gates.namePlaceholder")}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              

              {/* <div className="space-y-2">
                <Label htmlFor="nameAr">Arabic Name *</Label>
                <Input className="h-8 text-sm px-2 max-w-xs"
                  id="nameAr"
                  {...register('nameAr')}
                  placeholder="أدخل اسم البوابة بالعربية"
                  dir="rtl"
                />
                {errors.nameAr && (
                  <p className="text-sm text-red-600">{errors.nameAr.message}</p>
                )}
              </div> */}
              <div className="space-y-2">
                <Label htmlFor="gateType">{t("gates.gateType")} </Label>
                <Input className="h-8 text-sm px-2 max-w-xs"
                  id="gateType"
                  {...register('gateType')}
                  placeholder={t("gates.gateTypePlaceholder")}
                />
                {errors.gateType && (
                  <p className="text-sm text-red-600">{errors.gateType.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* <div className="space-y-2">
                <Label htmlFor="gateType">{t("gates.gateType")} </Label>
                <Input className="h-8 text-sm px-2 max-w-xs"
                  id="gateType"
                  {...register('gateType')}
                  placeholder={t("gates.gateTypePlaceholder")}
                />
                {errors.gateType && (
                  <p className="text-sm text-red-600">{errors.gateType.message}</p>
                )}
              </div> */}

              {/* <div className="space-y-2">
                <Label htmlFor="gateTypeAr">Gate Type (Arabic) *</Label>
                <Input className="h-8 text-sm px-2 max-w-xs"
                  id="gateTypeAr"
                  {...register('gateTypeAr')}
                  placeholder="أدخل نوع البوابة بالعربية"
                  dir="rtl"
                />
                {errors.gateTypeAr && (
                  <p className="text-sm text-red-600">{errors.gateTypeAr.message}</p>
                )}
              </div> */}
               <div className="space-y-2">
              <Label htmlFor="location">Location </Label>
              <Input  className="h-8 text-sm px-2 max-w-xs"
                id="location"
                {...register('location')}
                     placeholder='Add location ....'              />
              {errors.location && (
                <p className="text-sm text-red-600">{errors.location.message}</p>
              )}
            </div>
        
            </div>

            

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                {...register('description')}
                placeholder="  Add description ..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Technical Configuration */}
        <Card className='bg-slate-50'>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              TechnicalConfiguration
            </CardTitle>
            <CardDescription>
                 add technical configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultProtocolId">نوع البروتوكول</Label>
                <Select
                  value={watchedProtocolId ?? ""}
                  onValueChange={(value) => {
                    setValue('defaultProtocolId', value);
                    // إذا تم اختيار بروتوكول محدد، قم بتعيين اسمه
                    if (value && value !== 'custom') {
                      const selectedProtocol = gateProtocols?.find(p => p.id === value);
                      if (selectedProtocol) {
                        setValue('protocolName', selectedProtocol.name);
                        setValue('protocolNameAr', selectedProtocol.name); // تعيين الاسم العربي أيضاً
                      }
                    } else if (value === 'custom') {
                      setValue('protocolName', '');
                      setValue('protocolNameAr', '');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="  Add protocol ..."/>
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTypes ? (
                      <SelectItem value="loading" disabled>
                        جاري التحميل...
                      </SelectItem>
                    ) : (
                      <>
                        {gateProtocols?.map((protocol) => (
                          <SelectItem key={protocol.id} value={protocol.id}>
                            <div className="flex items-center gap-2">
                              {getProtocolIcon(protocol.name)}
                              {protocol.name}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            custom protocol
                          </div>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* حقل البروتوكول المخصص */}
              {(watchedProtocolId === 'custom' || !watchedProtocolId) && (
                <div className="space-y-2">
                  <Label htmlFor="protocolName">
                    {watchedProtocolId === 'custom' ? '  Add protocol name ...' : t("gates.protocolName")}
                  </Label>
                  <Input
                    id="protocolName"
                    {...register('protocolName')}
                    placeholder={watchedProtocolId === 'custom' ? 'أدخل اسم البروتوكول' : t("gates.protocolNamePlaceholder")}
                  />
                  {errors.protocolName && (
                    <p className="text-sm text-red-600">{errors.protocolName.message}</p>
                  )}
                </div>
              )}

              {/* حقل الاسم العربي للبروتوكول المخصص */}
              {(watchedProtocolId === 'custom' || !watchedProtocolId) && (
                <div className="space-y-2">
                  <Label htmlFor="protocolNameAr">
                    {watchedProtocolId === 'custom' ? 'اسم البروتوكول بالعربية' : 'اسم البروتوكول بالعربية'}
                  </Label>
                  <Input
                    id="protocolNameAr"
                    {...register('protocolNameAr')}
                    placeholder="أدخل اسم البروتوكول بالعربية"
                    dir="rtl"
                  />
                  {errors.protocolNameAr && (
                    <p className="text-sm text-red-600">{errors.protocolNameAr.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="model"> Model </Label>
                <Input
                  id="model"
                  {...register('model')}
                  placeholder="ST-ST01, TA-309, etc."
                />
              </div>
            </div>

            {/* TCP/IP Configuration */}
            {(() => {
              const selectedProtocol = gateProtocols?.find(p => p.id === watchedProtocolId);
              const protocolName = selectedProtocol?.name || watch('protocolName');
              return (protocolName === 'TCP_IP' || protocolName === 'HTTP' || 
                      (watchedProtocolId === 'custom' && (protocolName?.includes('TCP') || protocolName?.includes('HTTP') || protocolName?.includes('IP'))));
            })() && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800">
                  <Network className="h-4 w-4" />
                  <span className="font-medium">إعدادات الشبكة</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress">  Add IP ... *</Label>
                    <Input
                      id="ipAddress"
                      {...register('ipAddress')}
                      placeholder="192.168.1.100"
                    />
                    {errors.ipAddress && (
                      <p className="text-sm text-red-600">{errors.ipAddress.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">  Add port ...</Label>
                    <Input
                      id="port"
                      type="number"
                      {...register('port')}
                      placeholder="80"
                    />
                    {errors.port && (
                      <p className="text-sm text-red-600">{errors.port.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* RS485 Configuration */}
            {(() => {
              const selectedProtocol = gateProtocols?.find(p => p.id === watchedProtocolId);
              const protocolName = selectedProtocol?.name || watch('protocolName');
              return (protocolName === 'RS485' || 
                      (watchedProtocolId === 'custom' && (protocolName?.includes('RS485') || protocolName?.includes('Serial'))));
            })() && (
              <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 text-orange-800">
                  <Cable className="h-4 w-4" />
                  <span className="font-medium">Add RS485</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serialPort"> Add serial port</Label>
                    <Input
                      id="serialPort"
                      {...register('serialPort')}
                      placeholder="COM3, /dev/ttyUSB0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baudRate"> Add baud rate</Label>
                    <Select
                      value={watch('baudRate')?.toString() ?? '9600'}
                      onValueChange={(value) => setValue('baudRate', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="9600" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9600">9600</SelectItem>
                        <SelectItem value="19200">19200</SelectItem>
                        <SelectItem value="38400">38400</SelectItem>
                        <SelectItem value="57600">57600</SelectItem>
                        <SelectItem value="115200">115200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxCapacity"> Add maxCapacity  (person/min)</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  {...register('maxCapacity')}
                  placeholder="30"
                />
                {errors.maxCapacity && (
                  <p className="text-sm text-red-600">{errors.maxCapacity.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
                <Label htmlFor="isActive">  active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
        Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {gate ? 'جاري التحديث...' : 'جاري الحفظ...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {gate ? ' updated' : 'create'}
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
