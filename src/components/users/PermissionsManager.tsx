'use client';

// import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Users, Building, CreditCard, ScanLine } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";



interface PermissionsManagerProps {
  permissions: string[];
  onPermissionsChange: (permissions: string[]) => void;
}

interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  permissions: {
    id: string;
    name: string;
    description: string;
  }[];
}

const permissionGroups: PermissionGroup[] = [
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their permissions',
    icon: Users,
    permissions: [
      {
        id: 'users.read',
        name: 'View Users',
        description: 'Can view user list and details',
      },
      {
        id: 'users.create',
        name: 'Create Users',
        description: 'Can create new users',
      },
      {
        id: 'users.update',
        name: 'Edit Users',
        description: 'Can edit existing users',
      },
      {
        id: 'users.delete',
        name: 'Delete Users',
        description: 'Can delete users',
      },
      {
        id: 'users.permissions',
        name: 'Manage Permissions',
        description: 'Can assign and remove permissions',
      },
    ],
  },
  {
    id: 'restaurants',
    name: 'Restaurant Management',
    description: 'Manage restaurants and meal services',
    icon: Building,
    permissions: [
      {
        id: 'restaurants.read',
        name: 'View Restaurants',
        description: 'Can view restaurant list and details',
      },
      {
        id: 'restaurants.create',
        name: 'Create Restaurants',
        description: 'Can create new restaurants',
      },
      {
        id: 'restaurants.update',
        name: 'Edit Restaurants',
        description: 'Can edit existing restaurants',
      },
      {
        id: 'restaurants.delete',
        name: 'Delete Restaurants',
        description: 'Can delete restaurants',
      },
      {
        id: 'restaurants.meals',
        name: 'Manage Meals',
        description: 'Can manage meal times and assignments',
      },
    ],
  },
  {
    id: 'guests',
    name: 'Guest Management',
    description: 'Manage guest registrations and visits',
    icon: Users,
    permissions: [
      {
        id: 'guests.read',
        name: 'View Guests',
        description: 'Can view guest list and details',
      },
      {
        id: 'guests.create',
        name: 'Register Guests',
        description: 'Can register new guests',
      },
      {
        id: 'guests.update',
        name: 'Edit Guests',
        description: 'Can edit guest information',
      },
      {
        id: 'guests.delete',
        name: 'Delete Guests',
        description: 'Can delete guest records',
      },
    ],
  },
  {
    id: 'cards',
    name: 'Card Management',
    description: 'Manage access cards and QR codes',
    icon: CreditCard,
    permissions: [
      {
        id: 'cards.read',
        name: 'View Cards',
        description: 'Can view card list and details',
      },
      {
        id: 'cards.create',
        name: 'Generate Cards',
        description: 'Can generate new access cards',
      },
      {
        id: 'cards.update',
        name: 'Update Cards',
        description: 'Can update access cards',
      },
      {
        id: 'cards.delete',
        name: 'Delete Cards',
        description: 'Can delete or deactivate cards',
      },
    ],
  },
  {
    id: 'scanning',
    name: 'Card Scanning',
    description: 'Scan and validate access cards',
    icon: ScanLine,
    permissions: [
      {
        id: 'scanning.scan',
        name: 'Scan Cards',
        description: 'Can scan QR codes and RFID cards',
      },
      {
        id: 'scanning.validate',
        name: 'Validate Access',
        description: 'Can validate guest access permissions',
      },
      {
        id: 'scanning.logs',
        name: 'View Scan Logs',
        description: 'Can view scanning history and logs',
      },
    ],
  },
  {
    id: 'gates',
    name: 'Gates Management',
    description: 'Manage access gates and QR codes',
    icon: Shield,
    permissions: [
      {
        id: 'gates.read',
        name: 'View Gates',
        description: 'Can view gates list and details',
      },
      {
        id: 'gates.create',
        name: 'Create Gates',
        description: 'Can create new access gates',
      },
      {
        id: 'gates.update',
        name: 'Edit Gates',
        description: 'Can edit access gates',
      },
      {
        id: 'gates.delete',
        name: 'Delete Gates',
        description: 'Can delete access gates',
      },
      {
        id: 'gates.control',
        name: 'Control Gates',
        description: 'Can control gate operations',
      },
    ],
  },
  
];

export function PermissionsManager({ permissions, onPermissionsChange }: PermissionsManagerProps) {
  const t = useTranslations();

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      onPermissionsChange([...permissions, permissionId]);
    } else {
      onPermissionsChange(permissions.filter(p => p !== permissionId));
    }
  };

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const group = permissionGroups.find(g => g.id === groupId);
    if (!group) return;

    const groupPermissions = group.permissions.map(p => p.id);
    
    if (checked) {
      // Add all group permissions
      const newPermissions = [...permissions];
      groupPermissions.forEach(permId => {
        if (!newPermissions.includes(permId)) {
          newPermissions.push(permId);
        }
      });
      onPermissionsChange(newPermissions);
    } else {
      // Remove all group permissions
      onPermissionsChange(permissions.filter(p => !groupPermissions.includes(p)));
    }
  };

  const isGroupFullySelected = (groupId: string) => {
    const group = permissionGroups.find(g => g.id === groupId);
    if (!group) return false;
    return group.permissions.every(p => permissions.includes(p.id));
  };

  const isGroupPartiallySelected = (groupId: string) => {
    const group = permissionGroups.find(g => g.id === groupId);
    if (!group) return false;
    return group.permissions.some(p => permissions.includes(p.id)) && !isGroupFullySelected(groupId);
  };

  return (
    <Card >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2  text-sm">
          
          <Shield className="h-4 w-4" />
          {t('users.permissions')}
        </CardTitle>
        <CardDescription className="text-xs ">
          {t('users.assign')} {t('users.permissions').toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent className=" space-y-2 p-3">
        {/* Selected Permissions Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('users.selected')}: 
          </span>
          <Badge variant="secondary">
            {permissions.length}
          </Badge>
        </div>

        <Separator />

        {/* Permission Groups */}
        <div className="space-y-4">
          {permissionGroups.map((group) => {
            const Icon = group.icon;
            const isFullySelected = isGroupFullySelected(group.id);
            const isPartiallySelected = isGroupPartiallySelected(group.id);

            return (
              <div key={group.id} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center space-x-1">
                  
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={isFullySelected}
                    onCheckedChange={(checked) => handleGroupToggle(group.id, checked as boolean)}
                    className={isPartiallySelected ? 'data-[state=checked]:bg-orange-500' : ''}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <label
                    htmlFor={`group-${group.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {group.name}
                  </label>
                  {isPartiallySelected && (
                    <Badge variant="outline" className="text-xs">
                      {t('users.partial')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {group.description}
                </p>

                {/* Group Permissions */}
                {/* <div className="ml-6 space-y-2">
                  {group.permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={permissions.includes(permission.id)}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.name}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div> */}
                {/* Collapsible for permissions */}
<Collapsible>
  <CollapsibleTrigger className="ml-4 flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer">
 
    Show Permissions
    <ChevronDown className="h-3 w-3" />
  </CollapsibleTrigger>

  <CollapsibleContent className="ml-4 space-y-1 mt-1">

    {group.permissions.map((permission) => (
      <div key={permission.id} className="flex items-start space-x-1">
        <Checkbox
          id={permission.id}
          checked={permissions.includes(permission.id)}
          onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
        />
        <div className="grid gap-0 leading-none">
          <label
            htmlFor={permission.id}
            className="text-xs font-medium cursor-pointer"
            // className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {permission.name}
          </label>
          <p className="text-[9px] text-muted-foreground">
            
            {permission.description}
          </p>
        </div>
      </div>
    ))}
  </CollapsibleContent>
</Collapsible>

                



              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default PermissionsManager;