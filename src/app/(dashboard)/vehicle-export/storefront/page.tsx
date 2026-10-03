"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Upload, Plus, Trash2, Image as ImageIcon, Globe, Layout, Palette, Wrench, Eye, Monitor, Smartphone, Moon, Sun, Check, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FadeIn, SlideUp } from '@/components/ui/motion/primitives';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

// ... (Existing interfaces - keeping them same for compatibility)
interface ExportStoreConfig {
    id: string;
    storeName: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    heroSlides: HeroSlide[];
    promoBanners: Banner[];
    featuredCategories: FeaturedCategory[];
    contactEmail?: string;
    contactPhone?: string;
    whatsappNumber?: string;
    address?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    // Bidding Settings
    requireDeposit?: boolean;
    minimumDeposit?: number;
    // New Content Fields
    aboutUs?: {
        story?: string;
        mission?: string;
        stats?: Array<{ value: string; label: string; icon: string }>;
        values?: Array<{ title: string; desc: string }>;
    };
    // New Contact Page Fields
    contactPage?: {
        title?: string;
        subtitle?: string;
        mapUrl?: string;
        businessHours?: string;
    };
    // Bank Details
    bankDetails?: {
        bankName?: string;
        accountName?: string;
        accountNumber?: string;
        swiftCode?: string;
        branch?: string;
        bankAddress?: string;
    };
}

interface HeroSlide {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    mobileImageUrl?: string;
    link?: string;
}

interface Banner {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    link?: string;
    bgColor?: string;
}

interface FeaturedCategory {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
}

export default function StorefrontManagerPage() {
    const [config, setConfig] = useState<ExportStoreConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    const { register, handleSubmit, setValue, watch, reset } = useForm<ExportStoreConfig>();

    const primaryColor = watch('primaryColor') || '#3b82f6';
    const storeName = watch('storeName') || 'Your Store';

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/vehicle-export/config');
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

    const handleSave = async (data: ExportStoreConfig) => {
        setSaving(true);
        try {
            const res = await fetch('/api/vehicle-export/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                // Trigger Confetti
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                toast.success('Storefront Published Successfully!', {
                    description: 'Your changes are now live on your vehicle export site.',
                    duration: 5000,
                    icon: '🚀'
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: any, index?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'vehicle-export');

        const toastId = toast.loading('Uploading...', { description: 'Please wait' });

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server Error: ${res.status} ${res.statusText} - ${errorText.substring(0, 50)}`);
            }

            const data = await res.json();

            if (data.success) {
                if (fieldName === 'logoUrl') {
                    setValue('logoUrl', data.url, { shouldDirty: true });
                } else if (fieldName === 'hero') {
                    const newSlides = [...(watch('heroSlides') || [])];
                    if (index !== undefined && newSlides[index]) {
                        newSlides[index].imageUrl = data.url;
                        setValue('heroSlides', newSlides, { shouldDirty: true });
                    }
                } else if (fieldName === 'hero-mobile') {
                    const newSlides = [...(watch('heroSlides') || [])];
                    if (index !== undefined && newSlides[index]) {
                        newSlides[index].mobileImageUrl = data.url;
                        setValue('heroSlides', newSlides, { shouldDirty: true });
                    }
                } else if (fieldName === 'banner') {
                    const newBanners = [...(watch('promoBanners') || [])];
                    // Ensure entry exists
                    if (newBanners.length === 0) {
                        newBanners.push({ id: Date.now().toString(), title: 'Promo', imageUrl: '' });
                    }
                    newBanners[0].imageUrl = data.url;
                    setValue('promoBanners', newBanners, { shouldDirty: true });
                }
                toast.success('Upload Complete', { id: toastId });
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Upload Error:', error);
            toast.error('Upload Failed', {
                id: toastId,
                description: error.message || 'Something went wrong',
                duration: 5000
            });
        }
    };

    // Helper to add slide
    const addSlide = () => {
        const slides = watch('heroSlides') || [];
        setValue('heroSlides', [...slides, { id: Date.now().toString(), title: 'New Slide', imageUrl: '' }]);
    };

    // Helper to remove slide
    const removeSlide = (index: number) => {
        const slides = watch('heroSlides') || [];
        setValue('heroSlides', slides.filter((_, i) => i !== index));
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;

    return (
        <div className="h-[calc(100vh-4rem)] p-4 flex gap-6 bg-gray-50/50 dark:bg-black overflow-hidden">

            {/* LEFT PANEL: Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">

                {/* Editor Header */}
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Palette className="h-6 w-6 text-pink-500" />
                            Visual Editor
                        </h1>
                        <p className="text-sm text-gray-500">Customize your digital storefront</p>
                    </div>
                    <Button
                        onClick={handleSubmit(handleSave)}
                        disabled={saving}
                        className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 rounded-full px-6"
                    >
                        {saving ? 'Publishing...' : 'Publish Changes'}
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <Tabs defaultValue="branding" className="w-full">
                        <div className="px-8 pt-6 sticky top-0 bg-white dark:bg-gray-900 z-10 pb-4">
                            <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full justify-start overflow-x-auto">
                                <TabsTrigger value="branding" className="rounded-lg px-4">Branding</TabsTrigger>
                                <TabsTrigger value="content" className="rounded-lg px-4">Hero & Content</TabsTrigger>
                                <TabsTrigger value="contact" className="rounded-lg px-4">Info & Contact</TabsTrigger>
                                <TabsTrigger value="settings" className="rounded-lg px-4">Settings</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="px-8 pb-20 space-y-8">

                            {/* BRANDING */}
                            <TabsContent value="branding" className="space-y-6 mt-0">
                                <FadeIn>
                                    <div className="grid gap-6">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center group cursor-pointer hover:border-indigo-400 transition-colors">
                                            <div className="relative w-32 h-32 mx-auto mb-4 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden">
                                                {watch('logoUrl') ? (
                                                    <Image src={watch('logoUrl')!} alt="Logo" fill className="object-contain p-4" />
                                                ) : <ImageIcon className="text-gray-300 h-10 w-10" />}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="text-white h-6 w-6" />
                                                </div>
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                                            </div>
                                            <p className="text-sm font-medium">Upload Brand Logo</p>
                                            <p className="text-xs text-gray-400 mt-1">Recommended: 512x512 PNG</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Store Name</Label>
                                                    <Input {...register('storeName')} placeholder="e.g. Unity Auto Export" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Brand Color</Label>
                                                    <div className="flex gap-2">
                                                        <input type="color" {...register('primaryColor')} className="h-10 w-12 rounded cursor-pointer" />
                                                        <Input {...register('primaryColor')} className="uppercase font-mono" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tagline</Label>
                                                <Input {...register('tagline')} placeholder="Premium Japanese Vehicles Direct to You" />
                                            </div>
                                        </div>
                                    </div>
                                </FadeIn>
                            </TabsContent>

                            {/* CONTENT */}
                            <TabsContent value="content" className="space-y-6 mt-0">
                                <FadeIn>
                                    <div className="space-y-8">
                                        {/* HERO SECTION */}
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-semibold text-lg">Hero Carousel</h3>
                                                <Button size="sm" variant="outline" onClick={addSlide}><Plus className="h-4 w-4 mr-2" />Add Slide</Button>
                                            </div>
                                            <p className="text-xs text-gray-400 -mt-4">Desktop: 1920×820px (21:9) · Mobile: 800×1000px (4:5 Portrait)</p>

                                            <AnimatePresence>
                                                {(watch('heroSlides') || []).map((slide, index) => (
                                                    <motion.div
                                                        key={slide.id || index}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 relative group"
                                                    >
                                                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                            <Button size="icon" variant="destructive" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => removeSlide(index)}>
                                                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                            </Button>
                                                        </div>

                                                        {/* Mobile-first layout: Text first, then images */}
                                                        <div className="flex flex-col gap-4">
                                                            {/* Text inputs - full width on mobile, side on desktop */}
                                                            <div className="space-y-2 sm:space-y-3">
                                                                <Input {...register(`heroSlides.${index}.title` as const)} placeholder="Headline Text" className="font-bold text-sm sm:text-base" />
                                                                <Input {...register(`heroSlides.${index}.subtitle` as const)} placeholder="Subtext (Optional)" className="text-sm sm:text-base" />
                                                            </div>

                                                            {/* Images - side by side on mobile, row on desktop */}
                                                            <div className="flex gap-2 sm:gap-3">
                                                                {/* Desktop Image */}
                                                                <div className="flex-1 sm:flex-none sm:w-40 aspect-[21/9] bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden border border-gray-100 dark:border-gray-800 border-dashed hover:border-primary/50 transition-colors">
                                                                    {slide.imageUrl && <Image src={slide.imageUrl} alt="Slide" fill className="object-cover" />}
                                                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, 'hero', index)} />
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                                                                        <ImageIcon className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                                                                        {!slide.imageUrl && <span className="text-[10px] text-gray-400 hidden sm:block">Click to upload</span>}
                                                                    </div>
                                                                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded">Desktop</div>
                                                                </div>
                                                                {/* Mobile Image */}
                                                                <div className="w-16 sm:w-20 aspect-[4/5] bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden border border-gray-100 dark:border-gray-800 border-dashed hover:border-primary/50 transition-colors">
                                                                    {slide.mobileImageUrl && <Image src={slide.mobileImageUrl} alt="Mobile Slide" fill className="object-cover" />}
                                                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, 'hero-mobile', index)} />
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                                                                        <Smartphone className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                                                                    </div>
                                                                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded">Mobile</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>

                                        <Separator />

                                        {/* ABOUT US SECTION */}
                                        <div className="space-y-6">
                                            <h3 className="font-semibold text-lg">About Us Page</h3>

                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label>Our Story</Label>
                                                    <textarea
                                                        {...register('aboutUs.story')}
                                                        rows={5}
                                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder="Tell your story..."
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Mission Statement</Label>
                                                    <textarea
                                                        {...register('aboutUs.mission')}
                                                        rows={2}
                                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder="Our mission is to..."
                                                    />
                                                </div>
                                            </div>

                                            {/* Key Stats */}
                                            <div className="space-y-4">
                                                <Label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Key Stats (Displayed on Page)</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {[0, 1, 2, 3].map((i) => (
                                                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 space-y-2">
                                                            <Input {...register(`aboutUs.stats.${i}.value` as any)} placeholder="10k+" className="h-8 text-sm" />
                                                            <Input {...register(`aboutUs.stats.${i}.label` as any)} placeholder="Label" className="h-8 text-xs text-gray-500" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Values */}
                                            <div className="space-y-4">
                                                <Label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Core Values</Label>
                                                <div className="grid gap-4">
                                                    {[0, 1, 2].map((i) => (
                                                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 space-y-3">
                                                            <Input {...register(`aboutUs.values.${i}.title` as any)} placeholder="Value Title" className="font-semibold" />
                                                            <textarea
                                                                {...register(`aboutUs.values.${i}.desc` as any)}
                                                                rows={2}
                                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                placeholder="Description..."
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Promotional Banner Section */}
                                    <div className="space-y-4 pt-6 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold">Promotional Banner</h3>
                                                <p className="text-sm text-gray-500">Wide banner displayed below the hero section. Suggested: 1400x250px</p>
                                            </div>
                                            <Switch
                                                checked={!!watch('promoBanners')?.[0]?.imageUrl}
                                                onCheckedChange={(checked) => {
                                                    const current = watch('promoBanners') || [];
                                                    if (!checked) {
                                                        setValue('promoBanners', []);
                                                    } else if (current.length === 0) {
                                                        setValue('promoBanners', [{ id: Date.now().toString(), title: '', imageUrl: '' }]);
                                                    }
                                                }}
                                            />
                                        </div>

                                        {(watch('promoBanners') || []).length > 0 && (
                                            <Card className="p-4 border-dashed">
                                                <div className="space-y-4">
                                                    {/* Image Upload */}
                                                    <div className="aspect-[21/5] relative bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-200 hover:border-indigo-500 transition-colors group">
                                                        {watch('promoBanners')?.[0]?.imageUrl ? (
                                                            <>
                                                                <Image
                                                                    src={watch('promoBanners')[0].imageUrl}
                                                                    alt="Banner"
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                    <Label htmlFor="banner-upload" className="cursor-pointer p-2 bg-white rounded-full hover:bg-gray-100">
                                                                        <Upload className="w-4 h-4" />
                                                                    </Label>
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="rounded-full h-8 w-8"
                                                                        onClick={() => setValue('promoBanners', [])}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                                                <ImageIcon className="w-8 h-8 mb-2" />
                                                                <span className="text-sm font-medium">Upload Banner Image</span>
                                                                <span className="text-xs text-gray-400 mt-1">Rec: 1400x350px</span>
                                                                <Label htmlFor="banner-upload" className="absolute inset-0 cursor-pointer" />
                                                            </div>
                                                        )}
                                                        <Input
                                                            id="banner-upload"
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileUpload(e, 'banner')}
                                                        />
                                                    </div>

                                                    {/* Link URL */}
                                                    <div className="space-y-2">
                                                        <Label>Banner Link (Optional)</Label>
                                                        <Input
                                                            placeholder="https://... or /inventory"
                                                            value={watch('promoBanners')?.[0]?.link || ''}
                                                            onChange={(e) => {
                                                                const newBanners = [...(watch('promoBanners') || [])];
                                                                if (newBanners[0]) {
                                                                    newBanners[0].link = e.target.value;
                                                                    setValue('promoBanners', newBanners, { shouldDirty: true });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </Card>
                                        )}
                                    </div>
                                </FadeIn>
                            </TabsContent>

                            {/* CONTACT */}
                            <TabsContent value="contact" className="space-y-6 mt-0">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Contact Information</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Contact Email</Label>
                                            <Input {...register('contactEmail')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Phone</Label>
                                            <Input {...register('contactPhone')} />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>WhatsApp (for direct chat)</Label>
                                            <Input {...register('whatsappNumber')} placeholder="+1..." />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Physical Address</Label>
                                            <Input {...register('address')} />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Social Links</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input {...register('facebookUrl')} placeholder="Facebook URL" />
                                                <Input {...register('instagramUrl')} placeholder="Instagram URL" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Contact Page Content */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Contact Page Content</h3>
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <Label>Page Header Title</Label>
                                            <Input {...register('contactPage.title')} placeholder="Contact Us" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Page Subtitle</Label>
                                            <textarea
                                                {...register('contactPage.subtitle')}
                                                rows={2}
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="We're here to help..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Google Map Embed URL</Label>
                                            <Input {...register('contactPage.mapUrl')} placeholder="<iframe src='...'></iframe> or URL" />
                                            <p className="text-xs text-muted-foreground">Paste the full iframe code or just the src URL from Google Maps.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Business Hours Text</Label>
                                            <Input {...register('contactPage.businessHours')} placeholder="Mon-Fri: 9am - 6pm" />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* SETTINGS */}
                            <TabsContent value="settings" className="space-y-6 mt-0">
                                {/* Bank Details Config */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg">Bank Configuration</h3>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Bank Name</Label>
                                                <Input {...register('bankDetails.bankName')} placeholder="e.g. Chase Bank" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Account Name</Label>
                                                <Input {...register('bankDetails.accountName')} placeholder="Company Name" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Account Number</Label>
                                                <Input {...register('bankDetails.accountNumber')} className="font-mono" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>SWIFT / BIC Code</Label>
                                                <Input {...register('bankDetails.swiftCode')} className="font-mono uppercase" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Branch Name</Label>
                                                <Input {...register('bankDetails.branch')} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Bank Address</Label>
                                                <Input {...register('bankDetails.bankAddress')} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Bidding Security</h3>
                                            <p className="text-sm text-blue-700 dark:text-blue-300">Require deposits before users can place bids.</p>
                                        </div>
                                        <Switch
                                            checked={watch('requireDeposit')}
                                            onCheckedChange={(checked) => setValue('requireDeposit', checked)}
                                        />
                                    </div>
                                    {watch('requireDeposit') && (
                                        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                            <span className="text-gray-500 font-bold">$</span>
                                            <Input
                                                type="number"
                                                {...register('minimumDeposit', { valueAsNumber: true })}
                                                className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto font-mono text-lg"
                                                placeholder="5000"
                                            />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                        </div>
                    </Tabs>
                </div>
            </div>

            {/* RIGHT PANEL: Live Preview */}
            <div className="w-[400px] hidden xl:flex flex-col bg-gray-200 dark:bg-gray-800 rounded-[2.5rem] border-8 border-gray-300 dark:border-gray-700 shadow-2xl overflow-hidden relative">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20" />

                {/* Preview Controls */}
                <div className="absolute top-8 right-4 z-20 flex gap-2">
                    {/* Could add interactive toggle here if needed */}
                </div>

                {/* Simulated Screen */}
                <div className="flex-1 bg-white dark:bg-black overflow-y-auto w-full no-scrollbar relative">

                    {/* Simulated Navbar */}
                    <div className="p-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur z-10">
                        <div className="text-lg font-bold" style={{ color: primaryColor }}>{storeName}</div>
                        <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800" />
                    </div>

                    {/* Simulated Hero */}
                    <div className="h-48 bg-gray-100 dark:bg-gray-900 relative">
                        {(watch('heroSlides') || [])[0]?.imageUrl && (
                            <Image src={(watch('heroSlides') || [])[0].imageUrl} alt="Hero" fill className="object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                            <h2 className="text-white text-xl font-bold leading-tight">
                                {(watch('heroSlides') || [])[0]?.title || 'Welcome Home'}
                            </h2>
                            <p className="text-white/80 text-sm mt-1">
                                {(watch('heroSlides') || [])[0]?.subtitle || watch('tagline')}
                            </p>
                        </div>
                    </div>

                    {/* Simulated Inventory Grid */}
                    <div className="p-4 grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-[3/4] rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2 space-y-2">
                                <div className="w-full h-2/3 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                                <div className="h-2 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
                                <div className="h-2 w-1/3 bg-gray-200 dark:bg-gray-800 rounded opacity-50" />
                            </div>
                        ))}
                    </div>

                    {/* Simulated WhatsApp Button */}
                    <div className="absolute bottom-6 right-6 z-20">
                        <div
                            className="bg-[#25D366] text-white p-3 rounded-full shadow-lg flex items-center gap-2 cursor-default"
                        >
                            <MessageCircle size={20} fill="white" />
                        </div>
                        {watch('whatsappNumber') && (
                            <div className="absolute -top-10 right-0 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 text-[10px] whitespace-nowrap animate-bounce">
                                Linked: {watch('whatsappNumber')}
                            </div>
                        )}
                    </div>

                </div>
            </div>

        </div>
    );
}
