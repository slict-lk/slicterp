"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface TaxCategory {
    id: string;
    name: string;
    rate: number;
    description: string;
    isDefault: boolean;
}

interface TaxConfig {
    isTaxEnabled: boolean;
    taxRegistrationNumber: string | null;
}

export default function TaxSettingsPage() {
    const [config, setConfig] = useState<TaxConfig>({ isTaxEnabled: true, taxRegistrationNumber: '' });
    const [categories, setCategories] = useState<TaxCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [configSaving, setConfigSaving] = useState(false);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<TaxCategory | null>(null);
    const [formData, setFormData] = useState({ name: '', rate: 0, description: '', isDefault: false });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, categoriesRes] = await Promise.all([
                fetch('/api/spareparts/config/tax'),
                fetch('/api/spareparts/config/tax-categories')
            ]);

            if (configRes.ok) setConfig(await configRes.json());
            if (categoriesRes.ok) setCategories(await categoriesRes.json());
        } catch (error) {
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleConfigSave = async () => {
        setConfigSaving(true);
        try {
            const res = await fetch('/api/spareparts/config/tax', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                toast.success("Settings saved");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            toast.error("Error saving settings");
        } finally {
            setConfigSaving(false);
        }
    };

    const handleCategorySave = async () => {
        try {
            const method = editingCategory ? 'PUT' : 'POST';
            const body = editingCategory ? { ...formData, id: editingCategory.id } : formData;

            const res = await fetch('/api/spareparts/config/tax-categories', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingCategory ? "Category updated" : "Category created");
                setIsDialogOpen(false);
                fetchData(); // Refresh list
            } else {
                toast.error("Failed to save category");
            }
        } catch (error) {
            toast.error("Error saving category");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;

        try {
            const res = await fetch(`/api/spareparts/config/tax-categories?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Category deleted");
                fetchData();
            } else {
                toast.error("Failed to delete (might be in use)");
            }
        } catch (error) {
            toast.error("Error deleting category");
        }
    };

    const openEdit = (cat: TaxCategory) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            rate: cat.rate,
            description: cat.description || '',
            isDefault: cat.isDefault
        });
        setIsDialogOpen(true);
    };

    const openAdd = () => {
        setEditingCategory(null);
        setFormData({ name: '', rate: 0, description: '', isDefault: false });
        setIsDialogOpen(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Tax Settings</h1>

            {/* Global Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Global Configuration</CardTitle>
                    <CardDescription>Manage general tax settings for your store.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between border p-4 rounded-lg bg-gray-50">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">Enable Tax Calculation</Label>
                            <p className="text-sm text-gray-500">
                                If disabled, tax will determine as 0% for all products.
                            </p>
                        </div>
                        <Switch
                            checked={config.isTaxEnabled}
                            onCheckedChange={(checked) => setConfig({ ...config, isTaxEnabled: checked })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tax Registration Number (VAT Reg No)</Label>
                        <Input
                            placeholder="e.g. 123456789-V"
                            value={config.taxRegistrationNumber || ''}
                            onChange={(e) => setConfig({ ...config, taxRegistrationNumber: e.target.value })}
                        />
                        <p className="text-sm text-gray-500">This number will be displayed on all invoices.</p>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleConfigSave} disabled={configSaving}>
                            {configSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tax Categories */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Tax Categories</CardTitle>
                        <CardDescription>Define different tax rates for your products.</CardDescription>
                    </div>
                    <Button onClick={openAdd} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category Name</TableHead>
                                <TableHead className="text-right">Rate (%)</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell className="text-right">{cat.rate}%</TableCell>
                                    <TableCell className="text-gray-500 text-sm">{cat.description}</TableCell>
                                    <TableCell className="text-center">
                                        {cat.isDefault && <Badge variant="secondary">Default</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(cat.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {categories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                                        No categories defined.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                        <DialogDescription>
                            Configure the tax rate details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Standard VAT"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rate (%)</Label>
                            <Input
                                type="number"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                                step="0.01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description"
                            />
                        </div>
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <Label>Set as Default</Label>
                            <Switch
                                checked={formData.isDefault}
                                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCategorySave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
