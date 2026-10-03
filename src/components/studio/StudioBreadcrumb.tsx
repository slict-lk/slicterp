"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function StudioBreadcrumb() {
    const pathname = usePathname();

    // Default to /studio
    if (!pathname || pathname === '/studio') {
        return null;
    }

    const segments = pathname.split('/').filter(Boolean);
    const studioIndex = segments.indexOf('studio');

    // Only show if we are within studio path
    if (studioIndex === -1) return null;

    const breadcrumbs = segments.slice(studioIndex + 1).map((segment, index, array) => {
        const path = `/${segments.slice(0, studioIndex + 2 + index).join('/')}`;
        const isLast = index === array.length - 1;

        // Capitalize and format segment
        const label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Handle dynamic IDs - match UUIDs and CUID patterns
        const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
            /^c[a-z0-9]{24,}$/i.test(segment);
        const displayLabel = isId ? 'Details' : label;

        return { path, label: displayLabel, isLast };
    });

    return (
        <nav className="flex items-center text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link
                href="/studio"
                className="flex items-center hover:text-slate-900 transition-colors"
            >
                <Home className="h-4 w-4" />
                <span className="sr-only">Studio Hub</span>
            </Link>

            {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center">
                    <ChevronRight className="h-4 w-4 mx-2 text-slate-300 shrink-0" />
                    {crumb.isLast ? (
                        <span className="font-medium text-slate-900 truncate max-w-[200px]" aria-current="page">
                            {crumb.label}
                        </span>
                    ) : (
                        <Link
                            href={crumb.path}
                            className="hover:text-slate-900 transition-colors truncate max-w-[150px]"
                        >
                            {crumb.label}
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    );
}
