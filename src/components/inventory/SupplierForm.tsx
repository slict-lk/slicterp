'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';

const supplierSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    contactPerson: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    taxId: z.string().optional(),
    isActive: z.boolean().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
    initialData?: Partial<SupplierFormData> & { id?: string };
    onSubmit: (data: SupplierFormData) => Promise<void>;
    onCancel: () => void;
}

export function SupplierForm({ initialData, onSubmit, onCancel }: SupplierFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: initialData?.name || '',
            contactPerson: initialData?.contactPerson || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
            address: initialData?.address || '',
            city: initialData?.city || '',
            country: initialData?.country || '',
            taxId: initialData?.taxId || '',
            isActive: initialData?.isActive ?? true,
        },
    });

    const [submitError, setSubmitError] = useState<string | null>(null);

    const onFormSubmit = async (data: SupplierFormData) => {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await onSubmit(data);
        } catch (err: any) {
            const message = err?.message || 'Failed to save supplier. Please try again.';
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {submitError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {submitError}
                </div>
            )}
            <div className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-2">
                    <Label htmlFor="name">Enterprise Name *</Label>
                    <Input id="name" {...register('name')} placeholder="e.g. Acme Corp" className={errors.name ? 'border-red-500' : ''} />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="contactPerson">Primary Contact</Label>
                        <Input id="contactPerson" {...register('contactPerson')} placeholder="e.g. John Doe" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID / EIN</Label>
                        <Input id="taxId" {...register('taxId')} placeholder="Optional" />
                    </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" {...register('email')} placeholder="contact@acme.com" className={errors.email ? 'border-red-500' : ''} />
                        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" {...register('phone')} placeholder="+1 (555) 000-0000" />
                    </div>
                </div>

                {/* Location Information */}
                <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Textarea id="address" {...register('address')} placeholder="123 Industrial Way..." rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="city">City / Region</Label>
                        <Input id="city" {...register('city')} placeholder="New York" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" {...register('country')} placeholder="USA" />
                    </div>
                </div>

                {/* Settings */}
                <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                    <Label htmlFor="isActive" className="font-normal cursor-pointer">Active Vendor</Label>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Vendor' : 'Onboard Vendor'}
                </Button>
            </div>
        </form>
    );
}
