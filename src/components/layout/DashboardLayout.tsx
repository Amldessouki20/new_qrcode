import { DashboardLayoutClient } from './DashboardLayoutClient';

interface DashboardLayoutProps {
  
  children: React.ReactNode;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <DashboardLayoutClient user={user}>
      {children}
    </DashboardLayoutClient>
  );
}