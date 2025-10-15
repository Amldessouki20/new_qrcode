import { DashboardLayoutClient } from './DashboardLayoutClient';
import { getUserPermissions } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';

type NavKey = 'dashboard' | 'users' | 'restaurants' | 'gates' | 'accommodation' | 'guests' | 'cards' | 'reports';

interface DashboardLayoutProps {
  
  children: React.ReactNode;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export async function DashboardLayout({ children, user }: DashboardLayoutProps) {
  // Server-side compute allowed nav keys to avoid client-side flicker
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  const requiredPermissionByKey: Record<NavKey, Permission | null> = {
    // Dashboard يتطلب صلاحية واضحة لضمان التحكم عبر نظام الصلاحيات
    dashboard: 'dashboard.view' as Permission,
    reports: 'users.read',
    users: 'users.read',
    restaurants: 'restaurants.read',
    gates: 'gates.read',
    accommodation: 'accommodation.read',
    guests: 'guests.read',
    cards: 'cards.read',
  };

  // Role-first baseline: ما يظهر تلقائيًا بناءً على الدور
  const allKeys = Object.keys(requiredPermissionByKey) as NavKey[];
  const roleBaseline: Record<string, NavKey[]> = {
    ADMIN: allKeys,
    SUPER_ADMIN: allKeys,
    MANAGER: ['dashboard', 'restaurants', 'guests', 'cards', 'gates'],
    USER: ['accommodation'],
  };

  let allowedNavKeys: NavKey[] = [];
  if (isAdmin) {
    allowedNavKeys = allKeys;
  } else {
    const perms = await getUserPermissions(user.id);
    const permittedByPerms = (Object.entries(requiredPermissionByKey)
      // لا نضيف العناصر ذات المتطلب null من الصلاحيات؛ هذه تُحكم بالدور فقط
      .filter(([, required]) => required !== null && perms.includes(required))
      .map(([key]) => key)) as NavKey[];

    // اجمع الأساس المعتمد على الدور + ما تسمح به الصلاحيات
    const baseline = roleBaseline[user.role] ?? [];
    const merged = new Set<NavKey>([...baseline, ...permittedByPerms]);

    // للمستخدم بدور USER: استخدم الأساس المعتمد على الدور + الصلاحيات
    // هذا يُظهر "الإقامة" كحد أدنى، ويضيف الصفحات التي يملك صلاحيتها
    allowedNavKeys = Array.from(merged);
  }

  return (
    <DashboardLayoutClient user={user} allowedNavKeys={allowedNavKeys}>
      {children}
    </DashboardLayoutClient>
  );
}