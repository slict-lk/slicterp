
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Save, Trash2, User, Building, Globe, Ship, Store, Users, Building2, Heart, Factory, Truck, Utensils, Hotel, BarChart3, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Available modules configuration
const AVAILABLE_MODULES = [
    { id: 'vehicle-export', name: 'Vehicle Export', icon: Ship, description: 'Japanese car export business' },
    { id: 'spareparts', name: 'Spare Parts Shop', icon: Store, description: 'Auto parts retail & POS' },
    { id: 'real-estate', name: 'Real Estate', icon: Building2, description: 'Property management' },
    { id: 'healthcare', name: 'Healthcare', icon: Heart, description: 'Hospital & clinic management' },
    { id: 'manufacturing', name: 'Manufacturing', icon: Factory, description: 'Production & BOM' },
    { id: 'purchasing', name: 'Purchasing', icon: Truck, description: 'Vendor & purchase orders' },
    { id: 'restaurant', name: 'Restaurant', icon: Utensils, description: 'POS & kitchen display' },
    { id: 'hotel', name: 'Hotel', icon: Hotel, description: 'Room booking & front desk' },
    { id: 'crm', name: 'CRM', icon: Users, description: 'Customer relationship' },
    { id: 'hr', name: 'HR', icon: Users, description: 'Human resources' },
    { id: 'reports', name: 'Reports', icon: BarChart3, description: 'Advanced analytics' },
];

interface TenantUser {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

interface TenantDetails {
    id: string;
    name: string;
    companyName: string;
    subdomain: string;
    domain: string | null;
    plan: string;
    status: string;
    createdAt: string;
    users: TenantUser[];
    _count: {
        users: number;
        properties: number;
    };
}

export default function TenantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [tenant, setTenant] = useState<TenantDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [togglingModule, setTogglingModule] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        domain: '',
        plan: '',
        status: '',
    });

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const res = await fetch(`/api/tenants/${id}`);
                if (!res.ok) throw new Error('Failed to fetch tenant');
                const data = await res.json();
                setTenant(data);
                setFormData({
                    name: data.name,
                    companyName: data.companyName,
                    domain: data.domain || '',
                    plan: data.plan,
                    status: data.status,
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTenant();

        // Fetch enabled modules for this tenant
        const fetchModules = async () => {
            try {
                const res = await fetch(`/api/admin/tenants/${id}/modules`);
                if (res.ok) {
                    const data = await res.json();
                    setEnabledModules(data.enabledModules || []);
                }
            } catch (err) {
                console.error('Failed to fetch modules:', err);
            }
        };
        fetchModules();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`/api/tenants/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to update tenant');

            setSuccess('Tenant updated successfully');
            const updatedData = await res.json();
            setTenant(prev => prev ? { ...prev, ...updatedData } : null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/tenants/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete tenant');

            router.push('/settings/tenants');
        } catch (err: any) {
            setError(err.message);
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold text-gray-900">Tenant not found</h2>
                <Link href="/settings/tenants">
                    <Button variant="link" className="mt-2">Back to Tenants</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/settings/tenants">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{tenant.companyName}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Globe className="h-4 w-4" />
                            <span>{tenant.subdomain}.erp.slict.lk</span>
                            <Badge variant={tenant.status === 'ACTIVE' ? 'default' : 'secondary'} className="ml-2">
                                {tenant.status}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Tenant
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="bg-green-50 text-green-700 border-green-200">
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="details" className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="modules">Modules</TabsTrigger>
                    <TabsTrigger value="users">Users ({tenant.users.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Settings</CardTitle>
                            <CardDescription>Manage general tenant information</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Tenant Name (Internal)</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name (Public)</Label>
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="domain">Custom Domain</Label>
                                <Input
                                    id="domain"
                                    name="domain"
                                    placeholder="e.g. app.acme.com"
                                    value={formData.domain}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plan">Subscription Plan</Label>
                                <Select value={formData.plan} onValueChange={(val) => handleSelectChange('plan', val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STARTER">Starter</SelectItem>
                                        <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                        <SelectItem value="TRIAL">Trial</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="modules" className="space-y-6 mt-6">
                    <Card>
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
                                            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isEnabled ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : 'bg-gray-50 dark:bg-gray-900'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${isEnabled ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-800'
                                                    }`}>
                                                    <Icon className={`h-5 w-5 ${isEnabled ? 'text-green-600' : 'text-gray-500'
                                                        }`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{module.name}</p>
                                                    <p className="text-xs text-muted-foreground">{module.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isToggling && <Loader2 className="h-4 w-4 animate-spin" />}
                                                <Switch
                                                    checked={isEnabled}
                                                    disabled={isToggling}
                                                    onCheckedChange={async (checked) => {
                                                        setTogglingModule(module.id);
                                                        try {
                                                            const res = await fetch(`/api/admin/tenants/${id}/modules`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ moduleId: module.id, enabled: checked }),
                                                            });
                                                            if (!res.ok) throw new Error('Failed to update');
                                                            const data = await res.json();
                                                            setEnabledModules(data.enabledModules);
                                                            setSuccess(`Module ${checked ? 'enabled' : 'disabled'} successfully`);
                                                            setTimeout(() => setSuccess(''), 3000);
                                                        } catch (err) {
                                                            setError('Failed to update module');
                                                            setTimeout(() => setError(''), 3000);
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
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Registered Users</CardTitle>
                            <CardDescription>Users associated with this tenant</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {tenant.users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
