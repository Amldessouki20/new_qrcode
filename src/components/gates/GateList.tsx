'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Shield, 
  MapPin, 
  Network, 
  Cable, 
  Globe, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface Gate {
  id: string;
  name: string;
  nameAr: string;
  type?: {
    id: string;
    name: string;
  } | null;
  gateType?: string;
  gateTypeAr?: string;
  defaultProtocol?: {
    id: string;
    name: string;
  };
  location: string;
  ipAddress?: string;
  port?: number;
  model?: string;
  isActive: boolean;
  status?: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastControlAt?: string;
  restaurants: Array<{
    id: string;
    name: string;
    nameAr: string;
  }>;
  _count: {
    restaurants: number;
    accessLogs: number;
  };
}

interface GatesListProps {
  locale: string;
}

export function GatesList({ locale }: GatesListProps) {

  const router = useRouter();
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAIN' | 'RESTAURANT'>('ALL');
  const [error, setError] = useState<string>('');

  const fetchGates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);

      const response = await fetch(`/api/gates?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في تحميل البوابات');
      }


      setGates(data.gates || []);
      setError('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في تحميل البوابات';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    fetchGates();
  }, [searchTerm, typeFilter, fetchGates]);

  // إعادة تحميل البيانات عند تركيز النافذة
  useEffect(() => {
    const handleFocus = () => {
      fetchGates();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGates]);

  // إعادة تحميل البيانات عند العودة للصفحة
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchGates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchGates]);

  const handleDeleteGate = async (gateId: string, gateName: string) => {
    if (!confirm(`هل أنت متأكد من حذف البوابة "${gateName}"؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/gates/${gateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في حذف البوابة');
      }

      toast.success(data.message || 'تم حذف البوابة بنجاح');
      fetchGates(); // Refresh the list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في حذف البوابة';
      toast.error(errorMessage);
    }
  };

  const handleToggleGate = async (gateId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/gates/${gateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل في تغيير حالة البوابة');
      }

      toast.success(data.message || 'تم تغيير حالة البوابة بنجاح');
      fetchGates(); // Refresh the list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في تغيير حالة البوابة';
      toast.error(errorMessage);
    }
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'TCP_IP': return <Network className="h-4 w-4 text-blue-600" />;
      case 'RS485': return <Cable className="h-4 w-4 text-orange-600" />;
      case 'HTTP': return <Globe className="h-4 w-4 text-green-600" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status?: string, isActive?: boolean) => {
    if (!isActive) return <PowerOff className="h-4 w-4 text-gray-500" />;
    
    switch (status) {
      case 'ONLINE': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'OFFLINE': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'ERROR': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusText = (status?: string, isActive?: boolean) => {
    if (!isActive) return ' Active';
    
    switch (status) {
      case 'ONLINE': return 'connected';
      case 'OFFLINE': return 'Not connected';
      case 'ERROR': return 'Error';
      default: return 'Not Active';
    }
  };

  const filteredGates = gates.filter(gate => {
    const matchesSearch = !searchTerm || 
      gate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gate.nameAr.includes(searchTerm) ||
      gate.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || gate.type?.name === typeFilter || gate.gateType === typeFilter;
    
    return matchesSearch && matchesType;
  });
  


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
         
        </div>
        <Button onClick={() => router.push(`/${locale}/gates/new`)}>
          <Plus className="h-4 w-4 mr-2" />
        Add new gate
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder= "Search gates"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={typeFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('ALL')}
            >
              All
            </Button>
            <Button
              variant={typeFilter === 'MAIN' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('MAIN')}
            >
              <Shield className="h-4 w-4 mr-1" />
              Main
            </Button>
          

              <Button
              variant={typeFilter === 'RESTAURANT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('RESTAURANT')}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Restaurant
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {filteredGates.length}from {gates.length} gate
        </div>
      </div>

      {/* Gates Grid */}
      {filteredGates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No gates found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || typeFilter !== 'ALL' 
                ? 'لا توجد بوابات تطابق معايير البحث'
                : 'لم يتم إنشاء أي بوابات بعد'
              }
            </p>
            {!searchTerm && typeFilter === 'ALL' && (
              <Button onClick={() => router.push(`/${locale}/gates/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add new gate
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGates.map((gate) => (
            <Card key={gate.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {(gate.type?.name === 'MAIN' || gate.gateType === 'MAIN') ? (
                      <Shield className="h-5 w-5 text-blue-600" />
                    ) : (
                      <MapPin className="h-5 w-5 text-green-600" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{gate.name}</CardTitle>
                      <CardDescription className="text-sm">{gate.name}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(gate.status, gate.isActive)}
                    <span className="text-xs text-gray-600">
                      {getStatusText(gate.status, gate.isActive)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{gate.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {gate.defaultProtocol && getProtocolIcon(gate.defaultProtocol.name)}
                    <span>{gate.defaultProtocol?.name || 'Not sepcified'} </span>
                    {gate.ipAddress && (
                      <Badge variant="outline" className="text-xs">
                        {gate.ipAddress}:{gate.port}
                      </Badge>
                    )}
                  </div>

                  {gate.model && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Settings className="h-4 w-4" />
                      <span>{gate.model}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{gate._count.restaurants}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      <span>{gate._count.accessLogs}</span>
                    </div>
                  </div>

                  <Badge variant={gate ? 'default' : 'secondary'}>
                    {gate ? 'Main' : 'Restaurant'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/${locale}/gates/${gate.id}`)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/${locale}/gates/${gate.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleGate(gate.id, gate.isActive)}
                  >
                    {gate.isActive ? (
                      <PowerOff className="h-4 w-4 text-red-600" />
                    ) : (
                      <Power className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteGate(gate.id, gate.name)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
