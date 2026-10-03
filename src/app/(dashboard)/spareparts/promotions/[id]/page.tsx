"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Percent, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function EditPromotionPage() {
    const router = useRouter();
    const params = useParams();
        const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        code: '',
        type: 'CODE',
        discountType: 'PERCENTAGE',
        discountValue: '',
        minimumPurchase: '',
        maximumDiscount: '',
        startDate: '',
        endDate: '',
        targetType: 'ALL',
        targetProducts: '',
        targetCategories: '',
        isActive: true,
    });

    const [tiers, setTiers] = useState<Array<{
        minQuantity: string;
        maxQuantity: string;
        discountType: string;
        discountValue: string;
    }>>([]);

    const fetchPromotion = useCallback(async () => {
        if (!params.id) return;
        try {
            const res = await fetch(`/api/spareparts/promotions/${params.id}`);
            if (res.ok) {
                const data = await res.json();

                // Format dates for input[type="date"]
                const formatDate = (dateStr: string | null) => {
                    if (!dateStr) return '';
                    return new Date(dateStr).toISOString().split('T')[0];
                };

                setFormData({
                    name: data.name,
                    description: data.description || '',
                    code: data.code || '',
                    type: data.type,
                    discountType: data.discountType,
                    discountValue: data.discountValue?.toString() || '',
                    minimumPurchase: data.minimumPurchase?.toString() || '',
                    maximumDiscount: data.maximumDiscount?.toString() || '',
                    startDate: formatDate(data.startDate),
                    endDate: formatDate(data.endDate),
                    targetType: data.targetScope || 'ALL', // Map targetScope back to targetType
                    targetProducts: data.targetProducts?.join(', ') || '',
                    targetCategories: data.targetCategories?.join(', ') || '',
                    isActive: data.isActive,
                });

                if (data.tiers && data.tiers.length > 0) {
                    setTiers(data.tiers.map((t: any) => ({
                        minQuantity: t.minQuantity.toString(),
                        maxQuantity: t.maxQuantity?.toString() || '',
                        discountType: t.discountType,
                        discountValue: t.discountValue.toString(),
                    })));
                } else if (data.type === 'QUANTITY') {
                    // Default tier if quantity type but no tiers (shouldn't happen usually)
                    setTiers([{ minQuantity: '10', maxQuantity: '', discountType: 'PERCENTAGE', discountValue: '5' }]);
                }
            } else {
                toast.error('Error', { description: 'Failed to load promotion' });
                router.push('/spareparts/promotions');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error', { description: 'Failed to load promotion' });
        } finally {
            setFetching(false);
        }
    }, [params.id, router, toast]);

    useEffect(() => {
        fetchPromotion();
    }, [fetchPromotion]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload: any = {
                ...formData,
                discountValue: parseFloat(formData.discountValue) || 0,
                minimumPurchase: formData.minimumPurchase ? parseFloat(formData.minimumPurchase) : null,
                maximumDiscount: formData.maximumDiscount ? parseFloat(formData.maximumDiscount) : null,
                startDate: new Date(formData.startDate),
                endDate: formData.endDate ? new Date(formData.endDate) : null,
                targetScope: formData.targetType,
                targetProducts: formData.targetProducts ? formData.targetProducts.split(',').map(s => s.trim()) : [],
                targetCategories: formData.targetCategories ? formData.targetCategories.split(',').map(s => s.trim()) : [],
                // Ensure helper methods know which fields to update
            };

            if (formData.type === 'QUANTITY') {
                payload.tiers = tiers.map(t => ({
                    minQuantity: parseInt(t.minQuantity),
                    maxQuantity: t.maxQuantity ? parseInt(t.maxQuantity) : null,
                    discountType: t.discountType,
                    discountValue: parseFloat(t.discountValue)
                }));
                payload.discountValue = 0;
            }

            const res = await fetch(`/api/spareparts/promotions/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success('Success', { description: 'Promotion updated successfully' });
                router.push('/spareparts/promotions');
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update promotion');
            }
        } catch (error: unknown) {
            toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update promotion' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/spareparts/promotions/${params.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Success', { description: 'Promotion deleted successfully' });
                router.push('/spareparts/promotions');
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete promotion');
            }
        } catch (error: unknown) {
            toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to delete promotion' });
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleTierChange = (index: number, field: string, value: string) => {
        const newTiers = [...tiers];
        (newTiers[index] as any)[field] = value;
        setTiers(newTiers);
    };

    const addTier = () => {
        setTiers([...tiers, { minQuantity: '', maxQuantity: '', discountType: 'PERCENTAGE', discountValue: '' }]);
    };

    const removeTier = (index: number) => {
        setTiers(tiers.filter((_, i) => i !== index));
    };

    if (fetching) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-screen-2xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Link href="/spareparts/promotions">
                        <Button variant="ghost" size="sm" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Promotions
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Percent className="h-8 w-8 text-primary" />
                        Edit Promotion
                    </h1>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete the promotion
                                and remove its data from our servers.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { }}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Promotion Details</CardTitle>
                            <CardDescription>Basic information about the promotion</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => handleChange('isActive', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="isActive">Active</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Promotion Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        placeholder="e.g., New Year Sale"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Promo Code</Label>
                                    <Input
                                        id="code"
                                        value={formData.code}
                                        onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                                        placeholder="e.g., NEWYEAR2025"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Describe the promotion..."
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Discount Configuration</CardTitle>
                            <CardDescription>Set up how the discount works</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Promotion Type</Label>
                                    <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CODE">Promo Code</SelectItem>
                                            <SelectItem value="AUTOMATIC">Automatic</SelectItem>
                                            <SelectItem value="COUPON">Coupon</SelectItem>
                                            <SelectItem value="QUANTITY">Quantity (Tiered)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.type !== 'QUANTITY' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="discountType">Discount Type</Label>
                                        <Select value={formData.discountType} onValueChange={(v) => handleChange('discountType', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                                <SelectItem value="FIXED_AMOUNT">Fixed Amount (LKR)</SelectItem>
                                                <SelectItem value="BUY_X_GET_Y">Buy X Get Y</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {formData.type === 'QUANTITY' ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Label>Quantity Tiers</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addTier}>
                                            Add Tier
                                        </Button>
                                    </div>
                                    {tiers.map((tier, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end border p-3 rounded-lg relative">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Min Qty</Label>
                                                <Input
                                                    type="number"
                                                    value={tier.minQuantity}
                                                    onChange={(e) => handleTierChange(index, 'minQuantity', e.target.value)}
                                                    placeholder="10"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Max Qty (Optional)</Label>
                                                <Input
                                                    type="number"
                                                    value={tier.maxQuantity}
                                                    onChange={(e) => handleTierChange(index, 'maxQuantity', e.target.value)}
                                                    placeholder="99"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Type</Label>
                                                <Select value={tier.discountType} onValueChange={(v) => handleTierChange(index, 'discountType', v)}>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="PERCENTAGE">%</SelectItem>
                                                        <SelectItem value="FIXED_AMOUNT">LKR</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Value</Label>
                                                <Input
                                                    type="number"
                                                    value={tier.discountValue}
                                                    onChange={(e) => handleTierChange(index, 'discountValue', e.target.value)}
                                                    placeholder="5"
                                                />
                                            </div>
                                            <div>
                                                {index > 0 && (
                                                    <Button type="button" variant="destructive" size="sm" onClick={() => removeTier(index)}>
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="discountValue">
                                            Discount Value * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(LKR)'}
                                        </Label>
                                        <Input
                                            id="discountValue"
                                            type="number"
                                            step="0.01"
                                            value={formData.discountValue}
                                            onChange={(e) => handleChange('discountValue', e.target.value)}
                                            placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '500'}
                                            required={formData.type !== 'QUANTITY'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="minimumPurchase">Minimum Purchase (LKR)</Label>
                                        <Input
                                            id="minimumPurchase"
                                            type="number"
                                            value={formData.minimumPurchase}
                                            onChange={(e) => handleChange('minimumPurchase', e.target.value)}
                                            placeholder="5000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="maximumDiscount">Max Discount (LKR)</Label>
                                        <Input
                                            id="maximumDiscount"
                                            type="number"
                                            value={formData.maximumDiscount}
                                            onChange={(e) => handleChange('maximumDiscount', e.target.value)}
                                            placeholder="10000"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Targeting & Actions */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Schedule & Actions</CardTitle>
                            <CardDescription>Duration and saving</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startDate">Start Date *</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => handleChange('startDate', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">End Date</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => handleChange('endDate', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 pt-2">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                                <Link href="/spareparts/promotions" className="block">
                                    <Button variant="outline" type="button" className="w-full">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Target Audience</CardTitle>
                            <CardDescription>Who can use this?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="targetType">Type</Label>
                                <Select value={formData.targetType} onValueChange={(v) => handleChange('targetType', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Customers</SelectItem>
                                        <SelectItem value="CUSTOMER_TYPE">Specific Customer Types</SelectItem>
                                        <SelectItem value="AUDIENCE">Customer Audience</SelectItem>
                                        <SelectItem value="PRODUCT">Specific Products</SelectItem>
                                        <SelectItem value="CATEGORY">Product Categories</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {formData.targetType === 'PRODUCT' && (
                                <div className="space-y-2">
                                    <Label htmlFor="targetProducts">Product IDs</Label>
                                    <Input
                                        id="targetProducts"
                                        value={formData.targetProducts}
                                        onChange={(e) => handleChange('targetProducts', e.target.value)}
                                        placeholder="prod_123, prod_456"
                                    />
                                    <p className="text-xs text-gray-500">Comma separated IDs</p>
                                </div>
                            )}
                            {formData.targetType === 'CATEGORY' && (
                                <div className="space-y-2">
                                    <Label htmlFor="targetCategories">Categories</Label>
                                    <Input
                                        id="targetCategories"
                                        value={formData.targetCategories}
                                        onChange={(e) => handleChange('targetCategories', e.target.value)}
                                        placeholder="Engine, Brakes"
                                    />
                                    <p className="text-xs text-gray-500">Comma separated names</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
