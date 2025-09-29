import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ar'],
 
  // Used when no locale matches
  defaultLocale: 'en',
  
  // The `pathnames` object holds pairs of internal and
  // external paths. Based on the locale, the external
  // paths are rewritten to the shared, internal ones.
  pathnames: {
    // If all locales use the same pathname, a single
    // external path can be provided for all locales
    '/': '/',
    '/login': {
      en: '/login',
      ar: '/تسجيل-الدخول'
    },
    '/dashboard': {
      en: '/dashboard', 
      ar: '/لوحة-التحكم'
    },
    '/users': {
      en: '/users',
      ar: '/المستخدمين'
    },
    '/restaurants': {
      en: '/restaurants',
      ar: '/المطاعم'
    },
    '/guests': {
      en: '/guests',
      ar: '/الضيوف'
    },
    '/cards': {
      en: '/cards',
      ar: '/البطاقات'
    },
    '/accommodation': {
      en: '/accommodation',
      ar: '/الاسكان'
    },
    '/gates': {
      en: '/gates',
      ar: '/البوابات'
    },
    '/reports': {
      en: '/reports',
      ar: '/التقارير'
    },
    '/scan': {
      en : '/scan',
      ar : '/المسح'
    }

  }
});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];