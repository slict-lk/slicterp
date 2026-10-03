"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function NewSupplierPage() {
    const router = useRouter();
        const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        paymentTermDays: '30',
        leadTimeDays: '7',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/spareparts/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    paymentTermDays: parseInt(formData.paymentTermDays) || 30,
                    leadTimeDays: parseInt(formData.leadTimeDays) || 7,
                }),
            });

            if (res.ok) {
                toast.success('Success', { description: 'Supplier created successfully' });
                router.push('/spareparts/suppliers');
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create supplier');
            }
        } catch (error: unknown) {
            toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to create supplier' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/spareparts/suppliers">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Suppliers
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Truck className="h-8 w-8 text-primary" />
                    Add Supplier
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Register a new parts supplier
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                        <CardDescription>Supplier company details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Lanka Auto Parts (Pvt) Ltd"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                                id="address"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                placeholder="Full address..."
                                rows={2}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Contact Details</CardTitle>
                        <CardDescription>Primary contact information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactPerson">Contact Person</Label>
                                <Input
                                    id="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                                    placeholder="e.g., Samantha Wijesinghe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="e.g., 0112567890"
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
                                placeholder="e.g., sales@supplier.lk"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Terms</CardTitle>
                        <CardDescription>Payment and delivery terms</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="paymentTermDays">Payment Terms (Days)</Label>
                                <Input
                                    id="paymentTermDays"
                                    type="number"
                                    value={formData.paymentTermDays}
                                    onChange={(e) => handleChange('paymentTermDays', e.target.value)}
                                    placeholder="30"
                                />
                                <p className="text-xs text-gray-500">Number of days to pay after receiving goods</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                                <Input
                                    id="leadTimeDays"
                                    type="number"
                                    value={formData.leadTimeDays}
                                    onChange={(e) => handleChange('leadTimeDays', e.target.value)}
                                    placeholder="7"
                                />
                                <p className="text-xs text-gray-500">Expected delivery time after ordering</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Link href="/spareparts/suppliers">
                        <Button variant="outline" type="button">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Add Supplier
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
