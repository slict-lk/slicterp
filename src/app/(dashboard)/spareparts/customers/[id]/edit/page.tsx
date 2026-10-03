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
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditCustomerPage() {
    const router = useRouter();
    const params = useParams();
        const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        alternatePhone: '',
        address: '',
        city: '',
        postalCode: '',
        businessName: '',
        taxId: '',
        customerType: 'RETAIL',
        creditLimit: '',
        paymentTermDays: '0',
    });

    const fetchCustomer = useCallback(async () => {
        try {
            const res = await fetch(`/api/spareparts/customers/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    alternatePhone: data.alternatePhone || '',
                    address: data.address || '',
                    city: data.city || '',
                    postalCode: data.postalCode || '',
                    businessName: data.businessName || '',
                    taxId: data.taxId || '',
                    customerType: data.customerType || 'RETAIL',
                    creditLimit: data.creditLimit ? data.creditLimit.toString() : '',
                    paymentTermDays: data.paymentTermDays ? data.paymentTermDays.toString() : '0',
                });
            } else {
                toast.error('Error', { description: 'Failed to fetch customer details' });
                router.push('/spareparts/customers');
            }
        } catch (error) {
            console.error('Error fetching customer:', error);
            toast.error('Error', { description: 'Failed to load customer data' });
        } finally {
            setLoading(false);
        }
    }, [params.id, router, toast]);

    useEffect(() => {
        if (params.id) {
            fetchCustomer();
        }
    }, [params.id, fetchCustomer]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.phone.trim()) {
            toast.error('Validation Error', { description: 'Name and phone are required' });
            return;
        }

        try {
            setSaving(true);
            const res = await fetch(`/api/spareparts/customers/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
                    paymentTermDays: parseInt(formData.paymentTermDays) || 0,
                }),
            });

            if (res.ok) {
                toast.success('Customer Updated', { description: 'Customer details have been saved.' });
                router.push(`/spareparts/customers/${params.id}`);
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update customer');
            }
        } catch (error: any) {
            toast.error('Error', { description: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/spareparts/customers/${params.id}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Edit Customer
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Update customer information
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>Customer contact details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="Enter customer name"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone *</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        placeholder="07X XXX XXXX"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alternatePhone">Alternate Phone</Label>
                                    <Input
                                        id="alternatePhone"
                                        value={formData.alternatePhone}
                                        onChange={(e) => handleChange('alternatePhone', e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="customer@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="Street address"
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        placeholder="City"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode">Postal Code</Label>
                                    <Input
                                        id="postalCode"
                                        value={formData.postalCode}
                                        onChange={(e) => handleChange('postalCode', e.target.value)}
                                        placeholder="00000"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Business Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Business Details</CardTitle>
                            <CardDescription>For wholesale and business customers</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="customerType">Customer Type</Label>
                                <Select
                                    value={formData.customerType}
                                    onValueChange={(value) => handleChange('customerType', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RETAIL">Retail - Walk-in customer</SelectItem>
                                        <SelectItem value="WHOLESALE">Wholesale - Bulk buyer</SelectItem>
                                        <SelectItem value="MECHANIC">Mechanic - Repair shop</SelectItem>
                                        <SelectItem value="FLEET">Fleet - Vehicle fleet</SelectItem>
                                        <SelectItem value="VIP">VIP - Premium customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="businessName">Business Name</Label>
                                <Input
                                    id="businessName"
                                    value={formData.businessName}
                                    onChange={(e) => handleChange('businessName', e.target.value)}
                                    placeholder="Company or business name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                                <Input
                                    id="taxId"
                                    value={formData.taxId}
                                    onChange={(e) => handleChange('taxId', e.target.value)}
                                    placeholder="For invoicing purposes"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="creditLimit">Credit Limit (LKR)</Label>
                                    <Input
                                        id="creditLimit"
                                        type="number"
                                        value={formData.creditLimit}
                                        onChange={(e) => handleChange('creditLimit', e.target.value)}
                                        placeholder="0 = No credit"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paymentTermDays">Payment Terms (Days)</Label>
                                    <Input
                                        id="paymentTermDays"
                                        type="number"
                                        value={formData.paymentTermDays}
                                        onChange={(e) => handleChange('paymentTermDays', e.target.value)}
                                        placeholder="0 = Cash only"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 mt-6">
                    <Link href={`/spareparts/customers/${params.id}`}>
                        <Button variant="outline" type="button">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Update Customer
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
