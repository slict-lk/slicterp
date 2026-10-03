'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Package, Ship, Store, Heart, Factory, Truck, Utensils, Hotel as HotelIcon, BarChart3 } from 'lucide-react';
import {
    ArrowLeft,
    Save,
    Loader2,
    Users,
    Calendar,
    Globe,
    Building2,
    Mail,
    Shield,
    Activity,
    Trash2,
    ExternalLink,
    CreditCard,
    Clock,
    CheckCircle,
    XCircle
} from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    companyName: string;
    subdomain: string;
    plan: string;
    status: string;
    createdAt: string;
    _count: { users: number };
    users: Array<{
        id: string;
        name: string;
        email: string;
        role: string | null;
        isActive: boolean;
        createdAt: string;
    }>;
}

const planConfig: Record<string, { gradient: string; icon: string }> = {
    STARTER: { gradient: 'from-gray-500 to-gray-600', icon: '🌱' },
    PROFESSIONAL: { gradient: 'from-blue-500 to-indigo-600', icon: '⚡' },
    ENTERPRISE: { gradient: 'from-purple-500 to-pink-600', icon: '🚀' },
};

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
    SUSPENDED: { color: 'text-red-700', bg: 'bg-red-50', icon: XCircle },
    TRIAL: { color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
    CANCELLED: { color: 'text-gray-700', bg: 'bg-gray-100', icon: XCircle },
};

// Available modules configuration
const AVAILABLE_MODULES = [
    { id: 'vehicle-export', name: 'Vehicle Export', icon: Ship, description: 'Japanese car export business' },
    { id: 'spareparts', name: 'Spare Parts Shop', icon: Store, description: 'Auto parts retail & POS' },
    { id: 'real-estate', name: 'Real Estate', icon: Building2, description: 'Property management' },
    { id: 'healthcare', name: 'Healthcare', icon: Heart, description: 'Hospital & clinic management' },
    { id: 'manufacturing', name: 'Manufacturing', icon: Factory, description: 'Production & BOM' },
    { id: 'purchasing', name: 'Purchasing', icon: Truck, description: 'Vendor & purchase orders' },
    { id: 'restaurant', name: 'Restaurant', icon: Utensils, description: 'POS & kitchen display' },
    { id: 'hotel', name: 'Hotel', icon: HotelIcon, description: 'Room booking & front desk' },
    { id: 'crm', name: 'CRM', icon: Users, description: 'Customer relationship' },
    { id: 'hr', name: 'HR', icon: Users, description: 'Human resources' },
    { id: 'reports', name: 'Reports', icon: BarChart3, description: 'Advanced analytics' },
];

export default function TenantEditPage() {
    const router = useRouter();
    const params = useParams();
    const tenantId = params.id as string;

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showForceDeleteModal, setShowForceDeleteModal] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [togglingModule, setTogglingModule] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        plan: '',
        status: '',
    });

    useEffect(() => {
        fetchTenant();
        fetchModules();
    }, [tenantId]);

    const fetchModules = async () => {
        try {
            const res = await fetch(`/api/admin/tenants/${tenantId}/modules`);
            if (res.ok) {
                const data = await res.json();
                setEnabledModules(data.enabledModules || []);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const fetchTenant = async () => {
        try {
            const res = await fetch(`/api/tenants/${tenantId}`);
            if (res.ok) {
                const data = await res.json();
                setTenant(data);
                setFormData({
                    name: data.name,
                    companyName: data.companyName,
                    plan: data.plan,
                    status: data.status,
                });
            } else {
                router.push('/admin/tenants');
            }
        } catch (error) {
            console.error('Error fetching tenant:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/tenants/${tenantId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                const updated = await res.json();
                setTenant(prev => prev ? { ...prev, ...updated } : null);
            }
        } catch (error) {
            console.error('Error updating tenant:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (force: boolean = false) => {
        if (!force && tenant && tenant._count.users > 0) {
            setShowForceDeleteModal(true);
            return;
        }

        if (!force && !confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            const url = force ? `/api/tenants/${tenantId}?force=true` : `/api/tenants/${tenantId}`;
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                router.push('/admin/tenants');
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Failed to delete tenant' }));
                alert(errorData.error || 'Failed to delete tenant');
            }
        } catch (error) {
            console.error('Error deleting tenant:', error);
        } finally {
            setIsDeleting(false);
            setShowForceDeleteModal(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        setDeletingUserId(userId);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                // Refresh tenant data
                fetchTenant();
            } else {
                const error = await res.text();
                alert(error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        } finally {
            setDeletingUserId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!tenant) {
        return <div className="p-8 text-center">Tenant not found</div>;
    }

    const StatusIcon = statusConfig[tenant.status]?.icon || Activity;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Premium Header */}
            <div className="relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${planConfig[tenant.plan]?.gradient || 'from-slate-600 to-slate-800'}`} />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

                <div className="relative px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Back Button */}
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/admin/tenants')}
                            className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Tenants
                        </Button>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            {/* Tenant Info */}
                            <div className="flex items-center gap-5">
                                <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white font-bold text-3xl shadow-2xl border border-white/20">
                                    {tenant.companyName?.charAt(0) || 'T'}
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-1">
                                        {tenant.companyName || tenant.name}
                                    </h1>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1.5 text-white/80">
                                            <Globe className="h-4 w-4" />
                                            <span>{tenant.subdomain}.erp.slict.lk</span>
                                        </div>
                                        <Badge
                                            className={`${statusConfig[tenant.status]?.bg} ${statusConfig[tenant.status]?.color} border-0`}
                                        >
                                            <StatusIcon className="h-3 w-3 mr-1" />
                                            {tenant.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="secondary"
                                    className="bg-white/20 text-white border-white/20 hover:bg-white/30"
                                    onClick={() => window.open(`http://${tenant.subdomain}.localhost:3000`, '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Visit Site
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-white text-gray-900 hover:bg-gray-100"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-white/60" />
                                    <div>
                                        <p className="text-2xl font-bold text-white">{tenant._count.users}</p>
                                        <p className="text-sm text-white/60">Users</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="h-5 w-5 text-white/60" />
                                    <div>
                                        <p className="text-2xl font-bold text-white">{planConfig[tenant.plan]?.icon} {tenant.plan}</p>
                                        <p className="text-sm text-white/60">Plan</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-white/60" />
                                    <div>
                                        <p className="text-lg font-bold text-white">{new Date(tenant.createdAt).toLocaleDateString()}</p>
                                        <p className="text-sm text-white/60">Created</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Activity className="h-5 w-5 text-white/60" />
                                    <div>
                                        <p className="text-lg font-bold text-white">Active</p>
                                        <p className="text-sm text-white/60">Last 24h</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-8 py-8">
                <Tabs defaultValue="settings" className="space-y-6">
                    <TabsList className="bg-white dark:bg-gray-800 shadow-sm p-1 rounded-xl">
                        <TabsTrigger value="settings" className="rounded-lg">
                            <Building2 className="h-4 w-4 mr-2" />
                            Settings
                        </TabsTrigger>
                        <TabsTrigger value="modules" className="rounded-lg">
                            <Package className="h-4 w-4 mr-2" />
                            Modules
                        </TabsTrigger>
                        <TabsTrigger value="users" className="rounded-lg">
                            <Users className="h-4 w-4 mr-2" />
                            Users ({tenant.users.length})
                        </TabsTrigger>
                        <TabsTrigger value="danger" className="rounded-lg text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Danger Zone
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="settings">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-0 shadow-lg">
                                <CardHeader>
                                    <CardTitle>Organization Settings</CardTitle>
                                    <CardDescription>Manage tenant information and configuration</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Internal Name</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="companyName">Company Name</Label>
                                            <Input
                                                id="companyName"
                                                value={formData.companyName}
                                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="plan">Subscription Plan</Label>
                                            <Select value={formData.plan} onValueChange={(val) => setFormData({ ...formData, plan: val })}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="STARTER">🌱 Starter</SelectItem>
                                                    <SelectItem value="PROFESSIONAL">⚡ Professional</SelectItem>
                                                    <SelectItem value="ENTERPRISE">🚀 Enterprise</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="status">Status</Label>
                                            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ACTIVE">✅ Active</SelectItem>
                                                    <SelectItem value="SUSPENDED">🚫 Suspended</SelectItem>
                                                    <SelectItem value="TRIAL">⏰ Trial</SelectItem>
                                                    <SelectItem value="CANCELLED">❌ Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t flex justify-end">
                                        <Button onClick={handleSave} disabled={isSaving} size="lg">
                                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="modules">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-0 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Module Access
                                    </CardTitle>
                                    <CardDescription>Enable or disable modules for this tenant. Changes apply to all users immediately.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {AVAILABLE_MODULES.map((module) => {
                                            const Icon = module.icon;
                                            const isEnabled = enabledModules.includes(module.id);
                                            const isToggling = togglingModule === module.id;
                                            return (
                                                <div
                                                    key={module.id}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isEnabled
                                                            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                                                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2.5 rounded-xl ${isEnabled
                                                                ? 'bg-emerald-100 dark:bg-emerald-900'
                                                                : 'bg-gray-200 dark:bg-gray-700'
                                                            }`}>
                                                            <Icon className={`h-5 w-5 ${isEnabled ? 'text-emerald-600' : 'text-gray-500'
                                                                }`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{module.name}</p>
                                                            <p className="text-xs text-muted-foreground">{module.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isToggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                                        <Switch
                                                            checked={isEnabled}
                                                            disabled={isToggling}
                                                            onCheckedChange={async (checked) => {
                                                                setTogglingModule(module.id);
                                                                try {
                                                                    const res = await fetch(`/api/admin/tenants/${tenantId}/modules`, {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ moduleId: module.id, enabled: checked }),
                                                                    });
                                                                    if (res.ok) {
                                                                        const data = await res.json();
                                                                        setEnabledModules(data.enabledModules);
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Failed to toggle module:', err);
                                                                } finally {
                                                                    setTogglingModule(null);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="users">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-0 shadow-lg">
                                <CardHeader>
                                    <CardTitle>Users</CardTitle>
                                    <CardDescription>All users in this organization</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {tenant.users.length === 0 ? (
                                            <div className="text-center py-12 text-gray-500">
                                                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                                <p>No users found in this tenant</p>
                                            </div>
                                        ) : (
                                            tenant.users.map((user, index) => (
                                                <motion.div
                                                    key={user.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-12 w-12">
                                                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                                                                {user.name?.charAt(0) || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <Mail className="h-3 w-3" />
                                                                <span>{user.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <Shield className="h-3 w-3" />
                                                            {user.role || 'USER'}
                                                        </Badge>
                                                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                                            {user.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            disabled={deletingUserId === user.id}
                                                        >
                                                            {deletingUserId === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="danger">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-red-200 bg-red-50/50">
                                <CardHeader>
                                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                                    <CardDescription>Irreversible actions for this tenant</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-6 border border-red-200 rounded-xl bg-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">Delete Tenant</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Permanently delete this tenant and all associated data. This action cannot be undone.
                                                </p>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleDelete(false)}
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                )}
                                                Delete Tenant
                                            </Button>
                                        </div>
                                        {tenant._count.users > 0 && (
                                            <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                This tenant has {tenant._count.users} active user(s). You will be asked to confirm deletion.
                                            </p>
                                        )}
                                    </div>

                                    {/* Force Delete Confirmation Dialog */}
                                    <Dialog open={showForceDeleteModal} onOpenChange={setShowForceDeleteModal}>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                                    <AlertTriangle className="h-5 w-5" />
                                                    Confirm Tenant Deletion
                                                </DialogTitle>
                                                <DialogDescription className="pt-4">
                                                    This will permanently delete:
                                                </DialogDescription>
                                                <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm mt-2">
                                                    <li>The tenant &quot;{tenant.companyName || tenant.name}&quot;</li>
                                                    <li><strong>{tenant._count.users} user(s)</strong> and their data</li>
                                                    <li>All associated settings and configurations</li>
                                                </ul>
                                                <p className="block mt-4 text-red-600 font-medium text-sm">
                                                    This action cannot be undone.
                                                </p>
                                            </DialogHeader>
                                            <DialogFooter className="gap-2 sm:gap-0">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowForceDeleteModal(false)}
                                                    disabled={isDeleting}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleDelete(true)}
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                    )}
                                                    Delete Tenant and {tenant._count.users} User(s)
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
