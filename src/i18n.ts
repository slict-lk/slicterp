import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['en', 'ta', 'si', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
    en: 'English',
    ta: 'தமிழ்',
    si: 'සිංහල',
    ar: 'العربية',
};

export const defaultLocale: Locale = 'en';

export default getRequestConfig(async () => {
    // Get locale from cookie, fallback to default
    const cookieStore = await cookies();
    const locale = (cookieStore.get('locale')?.value as Locale) || defaultLocale;

    // Validate locale
    const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

    return {
        locale: validLocale,
        messages: (await import(`../messages/${validLocale}.json`)).default,
    };
});
