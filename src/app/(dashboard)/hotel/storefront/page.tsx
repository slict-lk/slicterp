"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    Palette,
    ImageIcon,
    Upload,
    Monitor,
    Smartphone,
    MapPin,
    Phone,
    Mail,
    Globe,
    Facebook,
    Instagram,
    Twitter,
    Youtube,
    Hotel,
    Sparkles,
    Settings,
} from 'lucide-react';

// Fade-in animation wrapper
function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("animate-in fade-in-0 slide-in-from-bottom-4 duration-500", className)}>
            {children}
        </div>
    );
}

// Matching Prisma HotelConfig model
interface HotelConfig {
    id: string;
    tenantId: string;
    hotelName: string;
    tagline?: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    currency: string;
    heroImageUrl?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    aboutUs?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    mapEmbedUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    youtubeUrl?: string;
    footerText?: string;
    metaTitle?: string;
    metaDescription?: string;
}

export default function HotelStorefrontPage() {
    const [config, setConfig] = useState<HotelConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    const { register, handleSubmit, setValue, watch, reset } = useForm<HotelConfig>();

    const primaryColor = watch('primaryColor') || '#1a73e8';
    const hotelName = watch('hotelName') || 'Your Hotel';
    const tagline = watch('tagline') || 'Experience Luxury & Comfort';
    const heroImageUrl = watch('heroImageUrl');
    const logoUrl = watch('logoUrl');
    const heroTitle = watch('heroTitle') || 'Welcome to ' + hotelName;
    const heroSubtitle = watch('heroSubtitle') || 'Your perfect getaway awaits';

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/hotel/settings');
            const data = await res.json();
            if (data?.id) {
                setConfig(data);
                reset(data);
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to load config' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: HotelConfig) => {
        setSaving(true);
        try {
            const res = await fetch('/api/hotel/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                toast.success('Storefront Published!', {
                    description: 'Your hotel website changes are now live.',
                    duration: 5000,
                    icon: '🏨'
                });

                fetchConfig();
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            toast.error('Publication Failed', {
                description: 'Could not save changes. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof HotelConfig) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'hotel');

        const toastId = toast.loading('Uploading...', { description: 'Please wait' });

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });

            if (!res.ok) {
                throw new Error('Upload failed');
            }

            const data = await res.json();

            if (data.success) {
                setValue(fieldName, data.url, { shouldDirty: true });
                toast.dismiss(toastId);
                toast.success('Upload Complete!');
            }
        } catch (error) {
            toast.dismiss(toastId);
            toast.error('Upload Failed', { description: 'Could not upload file.' });
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
    );

    return (
        <div className="h-[calc(100vh-4rem)] p-4 flex gap-6 bg-gray-50/50 dark:bg-black overflow-hidden">

            {/* LEFT PANEL: Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">

                {/* Editor Header */}
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Palette className="h-6 w-6 text-amber-500" />
                            Hotel Visual Editor
                        </h1>
                        <p className="text-sm text-gray-500">Customize your hotel website appearance</p>
                    </div>
                    <Button
                        onClick={handleSubmit(handleSave)}
                        disabled={saving}
                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6"
                    >
                        {saving ? 'Publishing...' : 'Publish Changes'}
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <Tabs defaultValue="branding" className="w-full">
                        <div className="px-8 pt-6 sticky top-0 bg-white dark:bg-gray-900 z-10 pb-4">
                            <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full justify-start overflow-x-auto">
                                <TabsTrigger value="branding" className="rounded-lg px-4">
                                    <Sparkles className="h-4 w-4 mr-2" /> Branding
                                </TabsTrigger>
                                <TabsTrigger value="content" className="rounded-lg px-4">
                                    <ImageIcon className="h-4 w-4 mr-2" /> Hero & Content
                                </TabsTrigger>
                                <TabsTrigger value="contact" className="rounded-lg px-4">
                                    <Phone className="h-4 w-4 mr-2" /> Info & Contact
                                </TabsTrigger>
                                <TabsTrigger value="settings" className="rounded-lg px-4">
                                    <Settings className="h-4 w-4 mr-2" /> Settings
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="px-8 pb-20 space-y-8">

                            {/* BRANDING TAB */}
                            <TabsContent value="branding" className="space-y-6 mt-0">
                                <FadeIn>
                                    <div className="grid gap-6">
                                        {/* Logo Upload */}
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center group cursor-pointer hover:border-amber-400 transition-colors">
                                            <div className="relative w-32 h-32 mx-auto mb-4 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden">
                                                {logoUrl ? (
                                                    <Image src={logoUrl} alt="Logo" fill className="object-contain p-4" />
                                                ) : <Hotel className="text-gray-300 h-10 w-10" />}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="text-white h-6 w-6" />
                                                </div>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                                            </div>
                                            <p className="text-sm font-medium">Upload Hotel Logo</p>
                                            <p className="text-xs text-gray-400 mt-1">Recommended: 512x512 PNG</p>
                                        </div>

                                        {/* Name & Colors */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Hotel Name</Label>
                                                    <Input {...register('hotelName')} placeholder="e.g. Paradise Beach Resort" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Primary Color</Label>
                                                    <div className="flex gap-2">
                                                        <input type="color" {...register('primaryColor')} className="h-10 w-12 rounded cursor-pointer border-0" />
                                                        <Input {...register('primaryColor')} className="uppercase font-mono" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Secondary Color</Label>
                                                    <div className="flex gap-2">
                                                        <input type="color" {...register('secondaryColor')} className="h-10 w-12 rounded cursor-pointer border-0" />
                                                        <Input {...register('secondaryColor')} className="uppercase font-mono" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Accent Color</Label>
                                                    <div className="flex gap-2">
                                                        <input type="color" {...register('accentColor')} className="h-10 w-12 rounded cursor-pointer border-0" />
                                                        <Input {...register('accentColor')} className="uppercase font-mono" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tagline</Label>
                                                <Input {...register('tagline')} placeholder="Experience Luxury & Comfort" />
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            </TabsContent>

                            {/* HERO & CONTENT TAB */}
                            <TabsContent value="content" className="space-y-6 mt-0">
                                <FadeIn>
                                    <div className="space-y-6">
                                        {/* Hero Image Upload */}
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                            <Label className="block mb-4 text-lg font-semibold">Hero Image</Label>
                                            <div className="relative h-48 rounded-xl overflow-hidden group cursor-pointer bg-gray-100 dark:bg-gray-800">
                                                {heroImageUrl ? (
                                                    <Image src={heroImageUrl} alt="Hero" fill className="object-cover" />
                                                ) : (
                                                    <div className="h-full flex items-center justify-center">
                                                        <ImageIcon className="text-gray-300 h-16 w-16" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="text-white h-8 w-8" />
                                                </div>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'heroImageUrl')} />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">Recommended: 1920x1080 JPG</p>
                                        </div>

                                        {/* Hero Text */}
                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <Label>Hero Title</Label>
                                                <Input {...register('heroTitle')} placeholder="Welcome to Paradise" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Hero Subtitle</Label>
                                                <Input {...register('heroSubtitle')} placeholder="Your perfect getaway awaits" />
                                            </div>
                                        </div>

                                        {/* About Us */}
                                        <div className="space-y-2">
                                            <Label>About Us</Label>
                                            <Textarea
                                                {...register('aboutUs')}
                                                placeholder="Tell your guests about your hotel's story, values, and what makes you unique..."
                                                rows={6}
                                            />
                                        </div>
                                    </div>
                                </FadeIn>
                            </TabsContent>

                            {/* CONTACT TAB */}
                            <TabsContent value="contact" className="space-y-6 mt-0">
                                <FadeIn>
                                    <div className="space-y-6">
                                        {/* Contact Info */}
                                        <div className="grid gap-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
                                                    <Input {...register('contactEmail')} type="email" placeholder="contact@hotel.com" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</Label>
                                                    <Input {...register('contactPhone')} placeholder="+94 77 123 4567" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</Label>
                                                <Textarea {...register('address')} placeholder="123 Beach Road, Colombo, Sri Lanka" rows={3} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Google Maps Embed URL</Label>
                                                <Input {...register('mapEmbedUrl')} placeholder="https://www.google.com/maps/embed?..." />
                                            </div>
                                        </div>

                                        {/* Social Links */}
                                        <div className="space-y-4">
                                            <Label className="text-lg font-semibold">Social Media Links</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2"><Facebook className="h-4 w-4 text-blue-600" /> Facebook</Label>
                                                    <Input {...register('facebookUrl')} placeholder="https://facebook.com/yourhotel" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-500" /> Instagram</Label>
                                                    <Input {...register('instagramUrl')} placeholder="https://instagram.com/yourhotel" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2"><Twitter className="h-4 w-4 text-sky-500" /> Twitter/X</Label>
                                                    <Input {...register('twitterUrl')} placeholder="https://twitter.com/yourhotel" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500" /> YouTube</Label>
                                                    <Input {...register('youtubeUrl')} placeholder="https://youtube.com/@yourhotel" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            </TabsContent>

                            {/* SETTINGS TAB */}
                            <TabsContent value="settings" className="space-y-6 mt-0">
                                <FadeIn>
                                    <div className="space-y-6">
                                        {/* General Settings */}
                                        <div className="grid gap-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Currency</Label>
                                                    <Input {...register('currency')} placeholder="LKR" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Font Family</Label>
                                                    <Input {...register('fontFamily')} placeholder="Inter, sans-serif" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Footer Text</Label>
                                                <Input {...register('footerText')} placeholder="© 2024 Your Hotel. All rights reserved." />
                                            </div>
                                        </div>

                                        {/* SEO Settings */}
                                        <div className="space-y-4">
                                            <Label className="text-lg font-semibold">SEO Settings</Label>
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label>Meta Title</Label>
                                                    <Input {...register('metaTitle')} placeholder="Paradise Beach Resort - Luxury Hotel in Sri Lanka" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Meta Description</Label>
                                                    <Textarea
                                                        {...register('metaDescription')}
                                                        placeholder="Experience luxury beachfront accommodation at Paradise Beach Resort. Book your stay today!"
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            </TabsContent>

                        </div>
                    </Tabs>
                </div>
            </div>

            {/* RIGHT PANEL: Live Preview */}
            <div className="w-[380px] flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">

                {/* Preview Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Live Preview</span>
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={cn("p-1.5 rounded transition-colors", previewMode === 'desktop' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600')}
                        >
                            <Monitor className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={cn("p-1.5 rounded transition-colors", previewMode === 'mobile' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600')}
                        >
                            <Smartphone className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-hidden p-4">
                    <div className={cn(
                        "bg-white dark:bg-gray-950 rounded-2xl shadow-2xl overflow-hidden h-full transition-all duration-300 mx-auto",
                        previewMode === 'mobile' ? 'w-[280px]' : 'w-full'
                    )}>
                        {/* Mini Browser Chrome */}
                        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-900 rounded px-2 py-0.5 text-xs text-gray-400 truncate">
                                yourhotel.com
                            </div>
                        </div>

                        {/* Preview Website */}
                        <div className="h-[calc(100%-32px)] overflow-y-auto">
                            {/* Hero */}
                            <div
                                className="relative h-48 bg-cover bg-center flex items-center justify-center"
                                style={{
                                    backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    backgroundColor: primaryColor
                                }}
                            >
                                <div className="absolute inset-0 bg-black/40" />
                                <div className="relative text-center text-white p-4">
                                    {logoUrl && (
                                        <div className="w-16 h-16 mx-auto mb-2 bg-white/20 rounded-full p-2 backdrop-blur-sm">
                                            <Image src={logoUrl} alt="Logo" width={48} height={48} className="object-contain" />
                                        </div>
                                    )}
                                    <h2 className={cn("font-bold mb-1", previewMode === 'mobile' ? 'text-lg' : 'text-xl')}>
                                        {heroTitle}
                                    </h2>
                                    <p className="text-xs opacity-80">{heroSubtitle}</p>
                                </div>
                            </div>

                            {/* Welcome Section */}
                            <div className="p-4 text-center">
                                <h3 className="text-sm font-semibold mb-2" style={{ color: primaryColor }}>
                                    Welcome Home
                                </h3>
                                <p className="text-xs text-gray-500 line-clamp-3">
                                    {watch('aboutUs') || 'Your perfect getaway awaits. Experience luxury and comfort at our beautiful hotel.'}
                                </p>
                            </div>

                            {/* Rooms Preview */}
                            <div className="px-4 pb-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg aspect-[4/3] relative overflow-hidden">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Hotel className="h-6 w-6 text-gray-300" />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                                                <p className="text-white text-xs font-medium">Room {i}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-3 text-center border-t border-gray-100 dark:border-gray-800" style={{ backgroundColor: primaryColor + '10' }}>
                                <p className="text-[10px] text-gray-500">{hotelName}</p>
                                <p className="text-[8px] text-gray-400">{tagline}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
