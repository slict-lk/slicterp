'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { AVAILABLE_MODULES, MODULE_CATEGORIES } from '@/lib/modules';

export default function NewTenantPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        subdomain: '',
        plan: 'STARTER',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        domain: '',
        modules: [] as string[],
    });

    const handleModuleToggle = (moduleId: string) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.includes(moduleId)
                ? prev.modules.filter(m => m !== moduleId)
                : [...prev.modules, moduleId]
        }));
    };

    const selectAllModules = () => {
        setFormData(prev => ({ ...prev, modules: AVAILABLE_MODULES.map(m => m.id) }));
    };

    const clearAllModules = () => {
        setFormData(prev => ({ ...prev, modules: [] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push('/admin/tenants');
            } else {
                const error = await res.text();
                alert(`Error: ${error}`);
            }
        } catch (error) {
            console.error('Failed to create tenant', error);
            alert('Failed to create tenant');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modulesByCategory = MODULE_CATEGORIES.map(cat => ({
        ...cat,
        modules: AVAILABLE_MODULES.filter(m => m.category === cat.id)
    })).filter(cat => cat.modules.length > 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Create New Tenant</h2>
                    <p className="text-muted-foreground">Set up a new tenant with selected modules.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tenant Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tenant Details</CardTitle>
                        <CardDescription>Basic information about the new tenant.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Tenant Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Acme Corporation"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="companyName">Company Name *</Label>
                            <Input
                                id="companyName"
                                value={formData.companyName}
                                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                placeholder="Acme Corp Ltd."
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="subdomain">Subdomain *</Label>
                            <div className="flex items-center">
                                <Input
                                    id="subdomain"
                                    value={formData.subdomain}
                                    onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    placeholder="acme"
                                    required
                                />
                                <span className="ml-2 text-gray-500">.erp.slict.lk</span>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="plan">Plan</Label>
                            <Select
                                value={formData.plan}
                                onValueChange={(value) => setFormData({ ...formData, plan: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STARTER">Starter</SelectItem>
                                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="domain">Custom Domain (Optional)</Label>
                            <Input
                                id="domain"
                                value={formData.domain}
                                onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                placeholder="alphamc.pro"
                            />
                            <p className="text-xs text-gray-500 mt-1">If set, the tenant will be accessible directly via this domain (e.g. https://alphamc.pro).</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Admin User */}
                <Card>
                    <CardHeader>
                        <CardTitle>Admin User</CardTitle>
                        <CardDescription>Initial administrator account for this tenant.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="adminName">Admin Name</Label>
                            <Input
                                id="adminName"
                                value={formData.adminName}
                                onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <Label htmlFor="adminEmail">Admin Email *</Label>
                            <Input
                                id="adminEmail"
                                type="email"
                                value={formData.adminEmail}
                                onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                placeholder="admin@acme.com"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="adminPassword">Admin Password *</Label>
                            <Input
                                id="adminPassword"
                                type="password"
                                value={formData.adminPassword}
                                onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Module Selection */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Module Selection</CardTitle>
                                <CardDescription>Select which modules this tenant can access. Leave empty for all modules.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={selectAllModules}>Select All</Button>
                                <Button type="button" variant="outline" size="sm" onClick={clearAllModules}>Clear All</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {modulesByCategory.map(category => (
                                <div key={category.id}>
                                    <h4 className="font-semibold text-sm text-gray-700 mb-2">{category.name}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {category.modules.map(module => (
                                            <label key={module.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                                                <Checkbox
                                                    checked={formData.modules.includes(module.id)}
                                                    onCheckedChange={() => handleModuleToggle(module.id)}
                                                />
                                                <span>{module.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Tenant'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
