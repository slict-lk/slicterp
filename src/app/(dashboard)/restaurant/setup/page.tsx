'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, Coins } from 'lucide-react';

const taxSchema = z.object({
    enableTax: z.boolean().default(true),
    vatPercentage: z.coerce.number().min(0).max(100),
    ssclPercentage: z.coerce.number().min(0).max(100),
    enableServiceCharge: z.boolean().default(true),
    serviceChargePercentage: z.coerce.number().min(0).max(100),
});

type TaxFormValues = z.infer<typeof taxSchema>;

export default function RestaurantSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<TaxFormValues>({
        resolver: zodResolver(taxSchema),
        defaultValues: {
            enableTax: true,
            vatPercentage: 18, // SL Standard
            ssclPercentage: 2.5, // SL Standard
            enableServiceCharge: true,
            serviceChargePercentage: 10,
        },
    });

    const onSubmit = async (data: TaxFormValues) => {
        setIsLoading(true);
        // Simulate API save
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);
        toast.success('Tax definitions updated successfully');
        console.log('Saved Settings:', data);
    };

    const calculateExample = (basePrice: number) => {
        const values = form.watch();
        const serviceCharge = values.enableServiceCharge ? basePrice * (values.serviceChargePercentage / 100) : 0;
        const vat = values.enableTax ? (basePrice + serviceCharge) * (values.vatPercentage / 100) : 0;
        const sscl = values.enableTax ? (basePrice + serviceCharge) * (values.ssclPercentage / 100) : 0;
        const total = basePrice + serviceCharge + vat + sscl;

        return {
            base: basePrice.toFixed(2),
            serviceCharge: serviceCharge.toFixed(2),
            vat: vat.toFixed(2),
            sscl: sscl.toFixed(2),
            total: total.toFixed(2)
        };
    };

    const example = calculateExample(1000);

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Restaurant Settings</h1>
                <p className="text-slate-500">Configure taxes, charges, and operational preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-blue-600" />
                                    <CardTitle>Taxes & Charges (LK)</CardTitle>
                                </div>
                                <CardDescription>
                                    Configure government taxes (VAT, SSCL) and service charges.
                                    Current Sri Lankan standard rates are pre-filled.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">

                                {/* Service Charge Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="enableServiceCharge" className="flex flex-col gap-1">
                                            <span className="font-medium">Service Charge</span>
                                            <span className="font-normal text-slate-500 text-xs">Applied before taxes</span>
                                        </Label>
                                        <Switch
                                            id="enableServiceCharge"
                                            checked={form.watch('enableServiceCharge')}
                                            onCheckedChange={(checked) => form.setValue('enableServiceCharge', checked)}
                                        />
                                    </div>

                                    {form.watch('enableServiceCharge') && (
                                        <div className="pl-4 border-l-2 border-slate-100">
                                            <div className="max-w-[200px]">
                                                <Label htmlFor="serviceChargePercentage">Percentage (%)</Label>
                                                <Input
                                                    id="serviceChargePercentage"
                                                    type="number"
                                                    {...form.register('serviceChargePercentage')}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Government Taxes Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="enableTax" className="flex flex-col gap-1">
                                            <span className="font-medium">Government Taxes</span>
                                            <span className="font-normal text-slate-500 text-xs">VAT and SSCL</span>
                                        </Label>
                                        <Switch
                                            id="enableTax"
                                            checked={form.watch('enableTax')}
                                            onCheckedChange={(checked) => form.setValue('enableTax', checked)}
                                        />
                                    </div>

                                    {form.watch('enableTax') && (
                                        <div className="pl-4 border-l-2 border-slate-100 grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="vatPercentage">VAT (%)</Label>
                                                <Input
                                                    id="vatPercentage"
                                                    type="number"
                                                    step="0.1"
                                                    {...form.register('vatPercentage')}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="ssclPercentage">SSCL (%)</Label>
                                                <Input
                                                    id="ssclPercentage"
                                                    type="number"
                                                    step="0.1"
                                                    {...form.register('ssclPercentage')}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" disabled={isLoading} className="bg-blue-600">
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Configuration
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </div>

                {/* Live Preview Card */}
                <div className="md:col-span-1">
                    <Card className="bg-slate-50 border-slate-200 sticky top-4">
                        <CardHeader>
                            <CardTitle className="text-base">Billing Simulation</CardTitle>
                            <CardDescription>Example calculation for a LKR 1000 item.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Base Price</span>
                                <span className="font-medium">Rs. {example.base}</span>
                            </div>

                            {form.watch('enableServiceCharge') && (
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Service Charge ({form.watch('serviceChargePercentage')}%)</span>
                                    <span>+ Rs. {example.serviceCharge}</span>
                                </div>
                            )}

                            {form.watch('enableTax') && (
                                <>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>VAT ({form.watch('vatPercentage')}%)</span>
                                        <span>+ Rs. {example.vat}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>SSCL ({form.watch('ssclPercentage')}%)</span>
                                        <span>+ Rs. {example.sscl}</span>
                                    </div>
                                </>
                            )}

                            <Separator />

                            <div className="flex justify-between font-bold text-lg text-slate-900">
                                <span>Total</span>
                                <span>Rs. {example.total}</span>
                            </div>

                            <div className="mt-4 p-3 bg-blue-100 rounded-lg text-xs text-blue-800 leading-relaxed">
                                <span className="font-semibold">Note:</span> Sri Lankan tax logic typically applies VAT on (Base + Service Charge). SSCL logic may vary by registration.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
