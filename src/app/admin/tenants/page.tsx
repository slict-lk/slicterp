'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Building2,
    Users,
    TrendingUp,
    Search,
    Plus,
    MoreHorizontal,
    ExternalLink,
    Settings,
    Power,
    Zap,
    Globe,
    Calendar
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Tenant {
    id: string;
    name: string;
    companyName: string;
    subdomain: string;
    plan: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
    createdAt: string;
    _count: {
        users: number;
    };
}

const planColors: Record<string, string> = {
    STARTER: 'from-gray-500 to-gray-600',
    PROFESSIONAL: 'from-blue-500 to-indigo-600',
    ENTERPRISE: 'from-purple-500 to-pink-600',
};

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
    ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    SUSPENDED: { color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
    TRIAL: { color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    CANCELLED: { color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-400' },
};

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchTenants();
    }, []);

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
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (tenantId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            const res = await fetch(`/api/tenants/${tenantId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                setTenants(prev => prev.map(t =>
                    t.id === tenantId ? { ...t, status: newStatus as any } : t
                ));
            }
        } catch (error) {
            console.error('Failed to update tenant status', error);
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.companyName?.toLowerCase().includes(search.toLowerCase()) ||
        t.subdomain?.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: tenants.length,
        active: tenants.filter(t => t.status === 'ACTIVE').length,
        users: tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0),
    };

    return (
        <div className="min-h-screen">
            {/* Premium Gradient Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

                <div className="relative px-8 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2">
                                    Tenant Management
                                </h1>
                                <p className="text-lg text-purple-200/80">
                                    Oversee and manage all organizations in your platform
                                </p>
                            </div>
                            <Button
                                onClick={() => window.location.href = '/admin/tenants/new'}
                                className="bg-white text-purple-900 hover:bg-purple-50 shadow-xl shadow-purple-500/20"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New Tenant
                            </Button>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <Card className="bg-white/10 backdrop-blur-xl border-white/10 overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-purple-200">Total Tenants</p>
                                                <p className="text-4xl font-bold text-white mt-2">{stats.total}</p>
                                            </div>
                                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                                                <Building2 className="h-7 w-7 text-white" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="bg-white/10 backdrop-blur-xl border-white/10 overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-purple-200">Active Tenants</p>
                                                <p className="text-4xl font-bold text-white mt-2">{stats.active}</p>
                                            </div>
                                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                                                <TrendingUp className="h-7 w-7 text-white" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="bg-white/10 backdrop-blur-xl border-white/10 overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-purple-200">Total Users</p>
                                                <p className="text-4xl font-bold text-white mt-2">{stats.users}</p>
                                            </div>
                                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                                                <Users className="h-7 w-7 text-white" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-8 py-8 bg-gray-50 dark:bg-gray-900 min-h-[60vh]">
                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6"
                >
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Search tenants by name, company, or subdomain..."
                            className="pl-12 h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </motion.div>

                {/* Tenant Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : filteredTenants.length === 0 ? (
                    <div className="text-center py-16">
                        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No tenants found</h3>
                        <p className="text-gray-500">Try adjusting your search or create a new tenant</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredTenants.map((tenant, index) => (
                            <motion.div
                                key={tenant.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index % 6) }}
                            >
                                <Card className="group bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 overflow-hidden">
                                    {/* Plan Banner */}
                                    <div className={`h-2 bg-gradient-to-r ${planColors[tenant.plan] || planColors.STARTER}`} />

                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                                    {tenant.companyName?.charAt(0) || tenant.name?.charAt(0) || 'T'}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                                                        {tenant.companyName || tenant.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                                        <Globe className="h-3 w-3" />
                                                        <span>{tenant.subdomain}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => window.location.href = `/admin/tenants/${tenant.id}`}>
                                                        <Settings className="mr-2 h-4 w-4" />
                                                        Manage
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => window.open(`http://${tenant.subdomain}.localhost:3000`, '_blank')}>
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        Visit Site
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusChange(tenant.id, tenant.status)}
                                                        className={tenant.status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600'}
                                                    >
                                                        <Power className="mr-2 h-4 w-4" />
                                                        {tenant.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                <Users className="h-4 w-4" />
                                                <span>{tenant._count?.users || 0} users</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                <Calendar className="h-4 w-4" />
                                                <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <Badge
                                                variant="secondary"
                                                className={`${statusConfig[tenant.status]?.bg} ${statusConfig[tenant.status]?.color} border-0`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[tenant.status]?.dot} mr-1.5`} />
                                                {tenant.status}
                                            </Badge>

                                            <Badge variant="outline" className="font-medium">
                                                <Zap className="h-3 w-3 mr-1" />
                                                {tenant.plan}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
