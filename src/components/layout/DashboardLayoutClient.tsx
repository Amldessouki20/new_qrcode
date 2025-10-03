'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  UserCheck,
  CreditCard,
  FileText,
  User,
   Settings,
  LogOut,
  Menu,
  Shield,
  Building,
} from 'lucide-react';
// import { ThemeToggle } from '@/components/ui/ThemeToggle';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';


interface User {
  id: string;
  username: string;
  role: string;
}

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: User;
}

const navigationItems = [
  {
    key: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'users',
    href: '/users',
    icon: Users,
  },
  {
    key: 'restaurants',
    href: '/restaurants',
    icon: UtensilsCrossed,
  },
  {
    key: 'gates',
    href: '/gates',
    icon: Shield,
  },
  {
    key: 'accommodation',
    href: '/accommodation',
    icon: Building,
  },
  {
    key: 'guests',
    href: '/guests',
    icon: UserCheck,
  },
  {
    key: 'cards',
    href: '/cards',
    icon: CreditCard,
  },
  // {
  //   key: 'scan',
  //   href: '/scan',
  //   icon: QrCode,
  // },
  {
    key: 'reports',
    href: '/reports',
    icon: FileText,
  },
];

export function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations();

  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getUserDisplayName = () => {
    return user?.username || 'User';
  };

  const getUserInitials = () => {
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col  ">
      
       <div className="flex h-16 items-center border-0 px-6">
         <Link href={`/${locale}/dashboard`} className="flex items-center space-x-2">
          {/* <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm"></span>
          </div> */}
          {/* <span className="font-bold text-lg">{t('common.logo')}</span> */}
        </Link> 
      </div> 

       {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6  shadow-lg rounded-tr-xl rounded-br-xl">
       
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className={cn(
               "flex items-center space-x-4 p-3 rounded-lg text-sm font-bold text-gray-900 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 transform hover:scale-105",
          isRTL && "space-x-reverse"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-5 w-5" />
              <span>{t(`dashboard.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

    
     
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side={isRTL ? "right" : "left"} className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden   ">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-6 lg:px-8  shadow-md ">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button space */}
            <div className="w-10 lg:hidden" />
            <h1 className="text-xl font-semibold">{t('dashboard.title')}</h1>
          </div>
          
          {/* Header Controls */}
          <div className="flex items-center space-x-4 ">
            {/* Theme Toggle */}
            {/* <ThemeToggle /> */}
            
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Desktop user menu */}
            <div className="hidden lg:block">
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={getUserDisplayName()} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{getUserDisplayName()}</span>
                </Button>
              </DropdownMenuTrigger> 
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-56">
                    <DropdownMenuLabel>{t('profile.title')}</DropdownMenuLabel> 
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                     <Link href={`/${locale}/profile`} className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{t('profile.title')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/settings`} className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>{t('common.settings')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2 text-red-600">
                  <LogOut className="h-4 w-4" />
                  <span>{t('auth.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}