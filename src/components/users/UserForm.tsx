'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionsManager } from './PermissionsManager';
import { UserRole } from '@prisma/client';

import { useCallback } from 'react';

// type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface UserFormProps {
  mode: 'create' | 'edit';
  userToEdit?: {
    id: string;
    username: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  };
}



interface UserData {
  id?: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  password?: string
  permissions?: string[];
}

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER','SUPER_ADMIN']),
  isActive: z.boolean(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const editUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'SUPER_ADMIN']),
  isActive: z.boolean(),
  password: z.string().optional(),
});

export function UserForm({ mode, userToEdit }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const schema = mode === 'create' ? createUserSchema : editUserSchema;
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: userToEdit?.username || '',
      role: userToEdit?.role || 'USER',
      isActive: userToEdit?.isActive ?? true,
      password: '',
    },
  });

  const fetchUser = useCallback(async () => {
    if (!userToEdit) return;
  
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userToEdit.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        // Convert permission objects to permission names (strings)
        const permissionNames = (data.permissions || []).map((p: { name?: string } | string) => 
          typeof p === 'string' ? p : p.name || ''
        );
        setPermissions(permissionNames);
        form.reset({
          username: data.username || '',
          role: data.role || 'USER',
          isActive: data.isActive ?? true,
          password: '',
        });
      } else {
        toast.error(t('common.error'));
        router.push(`/${locale}/users`);
      }
    } catch {
      // Error handled
      toast.error(t('users.error'));
      router.push(`/${locale}/users`);
    } finally {
      setLoading(false);
    }
  }, [userToEdit, form, router, locale, t]);


  // Form is now initialized with proper default values, no need for additional reset
  
  
  useEffect(() => {
    if (mode === 'edit' && userToEdit) {
      fetchUser();
    }
  }, [mode,userToEdit,fetchUser]);

  // const fetchUser = async () => {
  //   if (!userToEdit) return;
    
  //  try {
  //     setLoading(true);
  //     const response = await fetch(`/api/users/${userToEdit.id}`);
  //     if (response.ok) {
  //       const data = await response.json();
  //       setUserData(data.user);
  //       setPermissions(data.user.permissions || []);
        
  //       // Update form with user data
  //       form.reset({
  //         username: data.user.username,
  //         role: data.user.role,
  //         isActive: data.user.isActive,
  //       });
  //     } else {
  //       toast.error(t('common.error'));
  //       router.push(`/${locale}/users`);
  //     }
  //   } catch (error) {

  //     toast.error(t('common.error'));
  //     router.push(`/${locale}/users`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      setLoading(true);
      
      const payload: (z.infer<typeof createUserSchema> | z.infer<typeof editUserSchema>) & { permissions: string[] } = {
        ...values,
        permissions: permissions,
      };
      
      if (mode === 'edit' && (!payload.password || payload.password.trim() === '')) {
        delete payload.password;
      }

      const url = mode === 'create' ? '/api/users' : `/api/users/${userToEdit?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(t('common.success'));
        router.push(`/${locale}/users`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || t('users.error'));
      }
    } catch {
      // Error handled
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/${locale}/users`);
  };

  if (mode === 'edit' && loading && !userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-hidden ">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2 bg-slate-200" />
          {t('common.back')}
        </Button>
        <div>
           <h1 className="text-2xl font-bold">
            {mode === 'create' ? t('users.addUser') : t('users.editUser')}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? t('users.create') + ' ' + t('users.title').toLowerCase()
              : t('users.edit') + ' ' + userData?.username
            }
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Form */}
        <div className="lg:col-span-2 ">
          <Card className='bg-slate-50'>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {/* <User className="h-5 w-5" />
                {t('title')} {t('information')}*/}
              </CardTitle> 
              {/* <CardDescription>
                {mode === 'create'
                  ? t('users.create')
                  : t(' users.update')
                }
              </CardDescription> */}
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.username')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.username')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.role')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('users.role')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="USER">User</SelectItem>
                              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {t('users.status')}
                            </FormLabel>
                            <FormDescription>
                              {t('users.statusDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}

                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {mode === 'create' ? t('auth.password') : t('auth.newPassword')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={mode === 'create' ? t('auth.password') : t('auth.newPassword')}
                            {...field}
                          />
                        </FormControl>
                        {mode === 'edit' && (
                          <FormDescription>
                            {t('common.leaveEmpty')}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleBack}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {mode === 'create' ? t('users.create') : t('users.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Permissions */}
        <div>
          <PermissionsManager
            permissions={permissions}
            onPermissionsChange={setPermissions}
          />
        </div>
      </div>
    </div>
  );
}

export default UserForm;