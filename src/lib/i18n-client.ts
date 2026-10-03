'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';

// Re-export for client components
export const useTranslations = useNextIntlTranslations;

// Helper to change locale (sets cookie and reloads)
export function setLocale(locale: string) {
    document.cookie = `locale=${locale};path=/;max-age=31536000`; // 1 year
    window.location.reload();
}

// Get current locale from cookie
export function getLocale(): string {
    if (typeof document === 'undefined') return 'en';
    const match = document.cookie.match(/locale=([^;]+)/);
    return match ? match[1] : 'en';
}
