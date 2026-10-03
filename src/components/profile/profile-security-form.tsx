'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const securitySchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type SecurityFormValues = z.infer<typeof securitySchema>;

export function ProfileSecurityTab() {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<SecurityFormValues>({
        resolver: zodResolver(securitySchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: SecurityFormValues) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/profile/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to update password');
            }

            toast.success('Password updated successfully');
            form.reset();
        } catch (error: any) {
            console.error('Password update error:', error);
            toast.error(error.message || 'Failed to update password');

            // If the error is about the current password, set a form error
            if (error.message.includes('current password')) {
                form.setError('currentPassword', {
                    type: 'manual',
                    message: 'Incorrect current password'
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
            <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <AlertTitle>Secure your account</AlertTitle>
                <AlertDescription>
                    Use a strong password to keep your account safe. We recommend at least 8 characters including symbols.
                </AlertDescription>
            </Alert>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            id="currentPassword"
                            type="password"
                            className="pl-9"
                            {...form.register('currentPassword')}
                        />
                    </div>
                    {form.formState.errors.currentPassword && (
                        <p className="text-sm text-red-500">{form.formState.errors.currentPassword.message}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                id="newPassword"
                                type="password"
                                className="pl-9"
                                {...form.register('newPassword')}
                            />
                        </div>
                        {form.formState.errors.newPassword && (
                            <p className="text-sm text-red-500">{form.formState.errors.newPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                className="pl-9"
                                {...form.register('confirmPassword')}
                            />
                        </div>
                        {form.formState.errors.confirmPassword && (
                            <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
