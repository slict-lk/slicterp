"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Database, Layout, Workflow, Zap } from 'lucide-react';

const navItems = [
    { name: 'Overview', href: '/studio', icon: LayoutDashboard },
    { name: 'Modules', href: '/studio/modules', icon: Database },
    { name: 'Dashboards', href: '/studio/dashboards', icon: Layout },
    { name: 'Workflows', href: '/studio/workflows', icon: Workflow },
    { name: 'Automation', href: '/studio/automation', icon: Zap },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-4rem)]">
            <div className="border-b bg-white top-0 z-30 sticky">
                <div className="px-6 flex h-14 items-center gap-6 overflow-x-auto no-scrollbar">
                    {navItems.map((item) => {
                        const isActive =
                            item.href === '/studio'
                                ? pathname === '/studio'
                                : pathname.startsWith(item.href);

                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors hover:text-primary",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-slate-500 hover:border-slate-300"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}
