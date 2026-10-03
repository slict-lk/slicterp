'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, Save } from 'lucide-react';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email(),
    phone: z.string().min(10, 'Phone number must be at least 10 characters').optional().or(z.literal('')),
    jobTitle: z.string().min(2, 'Job title is required'),
    bio: z.string().max(160, 'Bio must not exceed 160 characters').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileGeneralTab() {
    const { data: session } = useSession();
    const user = session?.user;
    const [isLoading, setIsLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: user?.name || '',
            email: user?.email || '',
            phone: '', // TODO: Fetch from actual profile data if available
            jobTitle: user?.role === 'ADMIN' || user?.isSuperAdmin ? 'Administrator' : 'User',
            bio: '',
        },
        values: { // Update form when session loads
            fullName: user?.name || '',
            email: user?.email || '',
            phone: '',
            jobTitle: user?.role === 'ADMIN' || user?.isSuperAdmin ? 'Administrator' : 'User',
            bio: '',
        }
    });

    const handleAvatarClick = () => {
        // Simulate file input click
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAvatarPreview(reader.result as string);
                    toast.success('Avatar updated successfully');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const onSubmit = async (data: ProfileFormValues) => {
        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);
        toast.success('Profile updated successfully');
        console.log('Form Data:', data);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <Avatar className="h-24 w-24 border-2 border-slate-100 shadow-md group-hover:opacity-90 transition-opacity">
                        <AvatarImage src={avatarPreview || user?.image || ''} />
                        <AvatarFallback className="text-xl bg-blue-600 text-white">
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-medium text-slate-900">Profile Picture</h3>
                    <p className="text-sm text-slate-500">Click to upload a new avatar. JPG, GIF or PNG.</p>
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input
                            id="company"
                            value={user?.tenant || ''}
                            disabled
                            className="bg-slate-50 text-slate-500 font-medium"
                        />
                        <p className="text-xs text-slate-400">Company name is managed in settings.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" {...form.register('fullName')} placeholder="Enter your name" />
                        {form.formState.errors.fullName && (
                            <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" {...form.register('email')} disabled className="bg-slate-50 text-slate-500" />
                        <p className="text-xs text-slate-400">Email cannot be changed contact admin.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" {...form.register('phone')} placeholder="+94 77 123 4567" />
                        {form.formState.errors.phone && (
                            <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input id="jobTitle" {...form.register('jobTitle')} placeholder="e.g. Manager" />
                        {form.formState.errors.jobTitle && (
                            <p className="text-sm text-red-500">{form.formState.errors.jobTitle.message}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                        id="bio"
                        {...form.register('bio')}
                        placeholder="Tell us a little about yourself"
                        className="h-24 resize-none"
                    />
                    {form.formState.errors.bio && (
                        <p className="text-sm text-red-500">{form.formState.errors.bio.message}</p>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? (
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
                </div>
            </form>
        </div>
    );
}
