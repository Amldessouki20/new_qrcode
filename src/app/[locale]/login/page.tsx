//app/[locale]/login/page.tsx



import { getTranslations } from 'next-intl/server';
import LoginForm from './components/LoginForm';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  await params; // Consume params to satisfy Next.js requirements
  const t = await getTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
         
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('common.appName')}
          </h1>
          {/* <p className="text-lg text-gray-600">
            {t('auth.welcomeMessage')}
          </p> */}
        </div>

        {/* Login Form */}
        <LoginForm />

   
      </div>
    </div>
  );
}