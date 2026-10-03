'use client';

import { Suspense } from 'react';
import { User, Shield, Bell, Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProfileGeneralTab } from '@/components/profile/profile-general-form';
import { ProfileSecurityTab } from '@/components/profile/profile-security-form';
import { Card } from '@/components/ui/card';

const sidebarItems = [
    { id: 'general', label: 'General', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
];

function ProfilePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get active tab from URL or default to 'general'
    const activeTab = searchParams.get('tab') || 'general';

    const handleTabChange = (tabId: string) => {
        // Update URL without refreshing the page
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tabId);
        router.replace(`/profile?${params.toString()}`);
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <Card className="p-2 bg-white shadow-sm border-slate-200">
                        <nav className="flex flex-col gap-1">
                            {sidebarItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                                        activeTab === item.id
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-blue-600" : "text-slate-400")} />
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </Card>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <Card className="bg-white shadow-sm border-slate-200 min-h-[600px] p-6">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {sidebarItems.find(i => i.id === activeTab)?.label}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Manage your {activeTab} settings and preferences.
                            </p>
                        </div>

                        <div className="mt-8">
                            {activeTab === 'general' && <ProfileGeneralTab />}
                            {activeTab === 'security' && <ProfileSecurityTab />}
                            {activeTab === 'notifications' && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Bell className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Notification settings coming soon</p>
                                </div>
                            )}
                            {activeTab === 'preferences' && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Settings className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Preferences coming soon</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfilePageContent />
        </Suspense>
    );
}
