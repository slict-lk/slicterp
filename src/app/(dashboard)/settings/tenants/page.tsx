
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building, Users, ExternalLink, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Tenant {
    id: string;
    name: string;
    companyName: string;
    subdomain: string;
    plan: string;
    status: string;
    createdAt: string;
    _count: {
        users: number;
    };
}

export default function TenantsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated' && !session?.user?.isSuperAdmin) {
            router.push('/dashboard');
            return;
        }

        const fetchTenants = async () => {
            try {
                const res = await fetch('/api/tenants');
                if (res.ok) {
                    const data = await res.json();
                    setTenants(data);
                }
            } catch (error) {
                console.error('Failed to fetch tenants', error);
            } finally {
                setLoading(false);
            }
        };

        if (status === 'authenticated') {
            fetchTenants();
        }
    }, [status, session, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
                    <p className="text-gray-600">Manage all organizations and their subscriptions</p>
                </div>
                <Link href="/admin/tenants/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Tenant
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6">
                {tenants.map((tenant) => (
                    <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Building className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">{tenant.name}</h3>
                                        <p className="text-gray-500">{tenant.companyName}</p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                            <span className="bg-gray-100 px-2 py-1 rounded">
                                                {tenant.subdomain}.erp.slict.lk
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                {tenant._count.users} Users
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {tenant.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-sm font-medium text-gray-500">
                                        Plan: {tenant.plan}
                                    </span>
                                    <Link href={`/admin/tenants/${tenant.id}`}>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <ExternalLink className="h-4 w-4" />
                                            Manage
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {tenants.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No tenants found</h3>
                        <p className="text-gray-500 mt-1">Get started by creating your first tenant organization.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
