import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { getUserFromCookies } from '@/lib/auth';




export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  // Check if user is already authenticated
  const cookieStore = await cookies();
  const cookieObj = Object.fromEntries(
    cookieStore.getAll().map((cookie: { name: string; value: string }) => [cookie.name, cookie.value])
  );
  
  const user = await getUserFromCookies(cookieObj);
  
  if (user) {
    // User is authenticated, redirect to dashboard
    redirect(`/${locale}/dashboard`);
  } else {
    // User is not authenticated, redirect to login page
    redirect(`/${locale}/login`);
  }
}