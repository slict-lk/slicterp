'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/hotel/image-upload';
import {
    Settings,
    Palette,
    Image as ImageIcon,
    Mail,
    Search,
    Save,
    Loader2,
    ArrowLeft,
    FolderOpen
} from 'lucide-react';
import Link from 'next/link';

// Validation Schema
const settingsSchema = z.object({
    hotelName: z.string().min(2, 'Hotel name is required'),
    tagline: z.string().optional(),
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
    fontFamily: z.string().optional(),
    heroImageUrl: z.string().optional(),
    heroTitle: z.string().optional(),
    heroSubtitle: z.string().optional(),
    aboutUs: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
    mapEmbedUrl: z.string().optional(),
    facebookUrl: z.string().url().optional().or(z.literal('')),
    instagramUrl: z.string().url().optional().or(z.literal('')),
    twitterUrl: z.string().url().optional().or(z.literal('')),
    youtubeUrl: z.string().url().optional().or(z.literal('')),
    footerText: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    // Module Heroes
    diningHeroTitle: z.string().optional(),
    diningHeroSubtitle: z.string().optional(),
    diningHeroImage: z.string().optional(),
    experienceHeroTitle: z.string().optional(),
    experienceHeroSubtitle: z.string().optional(),
    experienceHeroImage: z.string().optional(),
    eventHeroTitle: z.string().optional(),
    eventHeroSubtitle: z.string().optional(),
    eventHeroImage: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function HotelSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            hotelName: '',
            tagline: '',
            logoUrl: '',
            faviconUrl: '',
            primaryColor: '#1a73e8',
            secondaryColor: '#202124',
            accentColor: '#f59e0b',
            fontFamily: 'Inter, sans-serif',
            heroImageUrl: '',
            heroTitle: '',
            heroSubtitle: '',
            aboutUs: '',
            contactEmail: '',
            contactPhone: '',
            address: '',
            mapEmbedUrl: '',
            facebookUrl: '',
            instagramUrl: '',
            twitterUrl: '',
            youtubeUrl: '',
            footerText: '',
            metaTitle: '',
            metaDescription: '',
            diningHeroTitle: '',
            diningHeroSubtitle: '',
            diningHeroImage: '',
            experienceHeroTitle: '',
            experienceHeroSubtitle: '',
            experienceHeroImage: '',
            eventHeroTitle: '',
            eventHeroSubtitle: '',
            eventHeroImage: '',
        },
    });

    // Fetch current settings
    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/hotel/settings');
                if (res.ok) {
                    const data = await res.json();
                    // Reset form with fetched data
                    form.reset({
                        hotelName: data.hotelName || '',
                        tagline: data.tagline || '',
                        logoUrl: data.logoUrl || '',
                        faviconUrl: data.faviconUrl || '',
                        primaryColor: data.primaryColor || '#1a73e8',
                        secondaryColor: data.secondaryColor || '#202124',
                        accentColor: data.accentColor || '#f59e0b',
                        fontFamily: data.fontFamily || 'Inter, sans-serif',
                        heroImageUrl: data.heroImageUrl || '',
                        heroTitle: data.heroTitle || '',
                        heroSubtitle: data.heroSubtitle || '',
                        aboutUs: data.aboutUs || '',
                        contactEmail: data.contactEmail || '',
                        contactPhone: data.contactPhone || '',
                        address: data.address || '',
                        mapEmbedUrl: data.mapEmbedUrl || '',
                        facebookUrl: data.facebookUrl || '',
                        instagramUrl: data.instagramUrl || '',
                        twitterUrl: data.twitterUrl || '',
                        youtubeUrl: data.youtubeUrl || '',
                        footerText: data.footerText || '',
                        metaTitle: data.metaTitle || '',
                        metaDescription: data.metaDescription || '',
                        diningHeroTitle: data.diningHeroTitle || '',
                        diningHeroSubtitle: data.diningHeroSubtitle || '',
                        diningHeroImage: data.diningHeroImage || '',
                        experienceHeroTitle: data.experienceHeroTitle || '',
                        experienceHeroSubtitle: data.experienceHeroSubtitle || '',
                        experienceHeroImage: data.experienceHeroImage || '',
                        eventHeroTitle: data.eventHeroTitle || '',
                        eventHeroSubtitle: data.eventHeroSubtitle || '',
                        eventHeroImage: data.eventHeroImage || '',
                    });
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, [form]);

    // Handle form submission
    const onSubmit = async (data: SettingsFormData) => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const res = await fetch('/api/hotel/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
                setTimeout(() => setSaveMessage(null), 3000);
            } else {
                const error = await res.json();
                setSaveMessage({ type: 'error', text: error.message || 'Failed to save settings' });
            }
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/hotel">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Website Settings</h1>
                        <p className="text-muted-foreground mt-1">
                            Customize your hotel&apos;s public website appearance
                        </p>
                    </div>
                </div>
                <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSaving}
                    size="lg"
                >
                    {isSaving ? (
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

            {/* Save Message */}
            {saveMessage && (
                <div className={`p-4 rounded-lg ${saveMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {saveMessage.text}
                </div>
            )}

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Tabs defaultValue="branding" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="branding" className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Branding
                        </TabsTrigger>
                        <TabsTrigger value="hero" className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Hero
                        </TabsTrigger>
                        <TabsTrigger value="assets" className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Assets
                        </TabsTrigger>
                        <TabsTrigger value="contact" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Contact
                        </TabsTrigger>
                        <TabsTrigger value="seo" className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            SEO
                        </TabsTrigger>
                    </TabsList>

                    {/* BRANDING TAB */}
                    <TabsContent value="branding">
                        <Card>
                            <CardHeader>
                                <CardTitle>Branding</CardTitle>
                                <CardDescription>
                                    Customize your hotel&apos;s name, logo, and theme colors
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Hotel Name & Tagline */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="hotelName">Hotel Name *</Label>
                                        <Input
                                            id="hotelName"
                                            {...form.register('hotelName')}
                                            placeholder="e.g. Ceylon Paradise Resort"
                                        />
                                        {form.formState.errors.hotelName && (
                                            <p className="text-sm text-destructive">{form.formState.errors.hotelName.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tagline">Tagline</Label>
                                        <Input
                                            id="tagline"
                                            {...form.register('tagline')}
                                            placeholder="e.g. Experience Luxury & Serenity"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Logo */}
                                <div className="space-y-2">
                                    <Label>Logo</Label>
                                    <ImageUpload
                                        value={form.watch('logoUrl') ? [form.watch('logoUrl')!] : []}
                                        onChange={(url) => form.setValue('logoUrl', url)}
                                        onRemove={() => form.setValue('logoUrl', '')}
                                        aspectRatio="banner"
                                        placeholder="Upload your hotel logo"
                                    />
                                </div>

                                <Separator />

                                {/* Theme Colors */}
                                <div>
                                    <Label className="text-base font-medium">Theme Colors</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Choose colors that match your brand identity
                                    </p>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="primaryColor">Primary Color</Label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    {...form.register('primaryColor')}
                                                    className="h-10 w-14 rounded border cursor-pointer"
                                                />
                                                <Input
                                                    {...form.register('primaryColor')}
                                                    placeholder="#1a73e8"
                                                    className="flex-1 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="secondaryColor">Secondary Color</Label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    {...form.register('secondaryColor')}
                                                    className="h-10 w-14 rounded border cursor-pointer"
                                                />
                                                <Input
                                                    {...form.register('secondaryColor')}
                                                    placeholder="#202124"
                                                    className="flex-1 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="accentColor">Accent Color</Label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    {...form.register('accentColor')}
                                                    className="h-10 w-14 rounded border cursor-pointer"
                                                />
                                                <Input
                                                    {...form.register('accentColor')}
                                                    placeholder="#f59e0b"
                                                    className="flex-1 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Font */}
                                <div className="space-y-2">
                                    <Label htmlFor="fontFamily">Font Family</Label>
                                    <Input
                                        id="fontFamily"
                                        {...form.register('fontFamily')}
                                        placeholder="Inter, sans-serif"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use Google Fonts or system fonts
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* HERO TAB */}
                    <TabsContent value="hero">
                        <Card>
                            <CardHeader>
                                <CardTitle>Hero Section</CardTitle>
                                <CardDescription>
                                    Configure the main banner on your homepage
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Hero Image */}
                                <div className="space-y-2">
                                    <Label>Hero Image</Label>
                                    <ImageUpload
                                        value={form.watch('heroImageUrl') ? [form.watch('heroImageUrl')!] : []}
                                        onChange={(url) => form.setValue('heroImageUrl', url)}
                                        onRemove={() => form.setValue('heroImageUrl', '')}
                                        aspectRatio="video"
                                        placeholder="Upload a stunning hero image"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Recommended size: 1920x1080 pixels
                                    </p>
                                </div>

                                <Separator />

                                {/* Hero Text */}
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="heroTitle">Hero Title</Label>
                                        <Input
                                            id="heroTitle"
                                            {...form.register('heroTitle')}
                                            placeholder="e.g. Welcome to Paradise"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                                        <Textarea
                                            id="heroSubtitle"
                                            {...form.register('heroSubtitle')}
                                            placeholder="e.g. Experience the ultimate beachfront luxury"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6">
                            {/* Dining Page Hero */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dining Page</CardTitle>
                                    <CardDescription>
                                        Configure the banner for the Dining page
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Dining Banner Image</Label>
                                        <ImageUpload
                                            value={form.watch('diningHeroImage') ? [form.watch('diningHeroImage')!] : []}
                                            onChange={(url) => form.setValue('diningHeroImage', url)}
                                            onRemove={() => form.setValue('diningHeroImage', '')}
                                            aspectRatio="video"
                                            placeholder="Upload dining banner"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <Label>Dining Title</Label>
                                            <Input
                                                {...form.register('diningHeroTitle')}
                                                placeholder="e.g. Culinary Excellence"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Dining Subtitle</Label>
                                            <Textarea
                                                {...form.register('diningHeroSubtitle')}
                                                placeholder="e.g. Savor exquisite flavors..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Experiences Page Hero */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Experiences Page</CardTitle>
                                    <CardDescription>
                                        Configure the banner for the Experiences page
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Experiences Banner Image</Label>
                                        <ImageUpload
                                            value={form.watch('experienceHeroImage') ? [form.watch('experienceHeroImage')!] : []}
                                            onChange={(url) => form.setValue('experienceHeroImage', url)}
                                            onRemove={() => form.setValue('experienceHeroImage', '')}
                                            aspectRatio="video"
                                            placeholder="Upload experiences banner"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <Label>Experiences Title</Label>
                                            <Input
                                                {...form.register('experienceHeroTitle')}
                                                placeholder="e.g. Unforgettable Adventures"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Experiences Subtitle</Label>
                                            <Textarea
                                                {...form.register('experienceHeroSubtitle')}
                                                placeholder="e.g. Discover the hidden gems..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Events Page Hero */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Events Page</CardTitle>
                                    <CardDescription>
                                        Configure the banner for the Events page
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Events Banner Image</Label>
                                        <ImageUpload
                                            value={form.watch('eventHeroImage') ? [form.watch('eventHeroImage')!] : []}
                                            onChange={(url) => form.setValue('eventHeroImage', url)}
                                            onRemove={() => form.setValue('eventHeroImage', '')}
                                            aspectRatio="video"
                                            placeholder="Upload events banner"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <Label>Events Title</Label>
                                            <Input
                                                {...form.register('eventHeroTitle')}
                                                placeholder="e.g. Host Your Dream Event"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Events Subtitle</Label>
                                            <Textarea
                                                {...form.register('eventHeroSubtitle')}
                                                placeholder="e.g. Perfect venues for every occasion..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ASSETS TAB */}
                    <TabsContent value="assets">
                        <Card>
                            <CardHeader>
                                <CardTitle>Default Website Assets</CardTitle>
                                <CardDescription>
                                    These are the default images used on your website. Upload your own images in the relevant sections to replace them.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Info Banner */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                    <strong>💡 Tip:</strong> Replace these placeholder images with your own high-quality photos to make your website unique.
                                    Use the <strong>Hero</strong> and <strong>Branding</strong> tabs to upload your custom images.
                                </div>

                                {/* Hero Images */}
                                <div>
                                    <Label className="text-base font-medium">Hero Background Images</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Large banner images displayed on the homepage. Recommended size: 1920x1080
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { src: 'hero_4.jpg', label: 'Hero 1 (Main)' },
                                            { src: 'hero_1.jpg', label: 'Hero 2' },
                                            { src: 'hero_2.jpg', label: 'Hero 3' },
                                            { src: 'hero_3.jpg', label: 'Hero 4' },
                                        ].map((img, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                                                    <img
                                                        src={`http://127.0.0.1:5500/hotel/images/${img.src}`}
                                                        alt={img.label}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="112" viewBox="0 0 200 112"><rect fill="%23f3f4f6" width="200" height="112"/><text x="50%" y="50%" fill="%239ca3af" font-size="14" text-anchor="middle" dominant-baseline="middle">Image</text></svg>';
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-center text-muted-foreground">{img.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Room Images */}
                                <div>
                                    <Label className="text-base font-medium">Room Images</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Sample room photos used in listings. Replace when adding your own rooms.
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { src: 'img_1.jpg', label: 'Room 1' },
                                            { src: 'img_2.jpg', label: 'Room 2' },
                                            { src: 'img_3.jpg', label: 'Room 3' },
                                            { src: 'img_4.jpg', label: 'Room 4' },
                                        ].map((img, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                                                    <img
                                                        src={`http://127.0.0.1:5500/hotel/images/${img.src}`}
                                                        alt={img.label}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="112" viewBox="0 0 200 112"><rect fill="%23f3f4f6" width="200" height="112"/><text x="50%" y="50%" fill="%239ca3af" font-size="14" text-anchor="middle" dominant-baseline="middle">Image</text></svg>';
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-center text-muted-foreground">{img.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Gallery Images */}
                                <div>
                                    <Label className="text-base font-medium">Gallery & Amenities</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Photos for the gallery section showing hotel amenities and facilities.
                                    </p>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                        {[
                                            { src: 'f_img_1.jpg', label: 'Pool' },
                                            { src: 'f_img_2.jpg', label: 'Spa' },
                                            { src: 'f_img_3.jpg', label: 'Restaurant' },
                                            { src: 'f_img_4.jpg', label: 'Lobby' },
                                            { src: 'f_img_5.jpg', label: 'Beach' },
                                            { src: 'f_img_6.jpg', label: 'Garden' },
                                        ].map((img, i) => (
                                            <div key={i} className="space-y-1">
                                                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                                                    <img
                                                        src={`http://127.0.0.1:5500/hotel/images/${img.src}`}
                                                        alt={img.label}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" fill="%239ca3af" font-size="12" text-anchor="middle" dominant-baseline="middle">Image</text></svg>';
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-center text-muted-foreground">{img.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Image Guidelines */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <Label className="text-base font-medium">📸 Image Guidelines</Label>
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="font-medium text-gray-700">Recommended Sizes:</p>
                                            <ul className="mt-1 space-y-1 text-muted-foreground">
                                                <li>• Hero Images: 1920 × 1080 px</li>
                                                <li>• Room Photos: 800 × 600 px</li>
                                                <li>• Gallery: 600 × 600 px (square)</li>
                                                <li>• Logo: 200 × 60 px (PNG with transparency)</li>
                                                <li>• Favicon: 32 × 32 px (ICO or PNG)</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700">Best Practices:</p>
                                            <ul className="mt-1 space-y-1 text-muted-foreground">
                                                <li>• Use high-quality, professional photos</li>
                                                <li>• Optimize images for web (under 500KB)</li>
                                                <li>• Ensure good lighting and composition</li>
                                                <li>• Use JPEG for photos, PNG for logos</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* CONTACT TAB */}
                    <TabsContent value="contact">
                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Information</CardTitle>
                                <CardDescription>
                                    Set up your contact details and social media links
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Contact Details */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="contactEmail">Email</Label>
                                        <Input
                                            id="contactEmail"
                                            type="email"
                                            {...form.register('contactEmail')}
                                            placeholder="reservations@yourhotel.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactPhone">Phone</Label>
                                        <Input
                                            id="contactPhone"
                                            {...form.register('contactPhone')}
                                            placeholder="+94 11 234 5678"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea
                                        id="address"
                                        {...form.register('address')}
                                        placeholder="123 Paradise Road, Galle, Sri Lanka"
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mapEmbedUrl">Google Maps Embed URL</Label>
                                    <Input
                                        id="mapEmbedUrl"
                                        {...form.register('mapEmbedUrl')}
                                        placeholder="https://www.google.com/maps/embed?pb=..."
                                    />
                                </div>

                                <Separator />

                                {/* Social Media */}
                                <div>
                                    <Label className="text-base font-medium">Social Media Links</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Connect your social media profiles
                                    </p>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="facebookUrl">Facebook</Label>
                                            <Input
                                                id="facebookUrl"
                                                {...form.register('facebookUrl')}
                                                placeholder="https://facebook.com/yourhotel"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="instagramUrl">Instagram</Label>
                                            <Input
                                                id="instagramUrl"
                                                {...form.register('instagramUrl')}
                                                placeholder="https://instagram.com/yourhotel"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="twitterUrl">Twitter / X</Label>
                                            <Input
                                                id="twitterUrl"
                                                {...form.register('twitterUrl')}
                                                placeholder="https://twitter.com/yourhotel"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="youtubeUrl">YouTube</Label>
                                            <Input
                                                id="youtubeUrl"
                                                {...form.register('youtubeUrl')}
                                                placeholder="https://youtube.com/@yourhotel"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SEO TAB */}
                    <TabsContent value="seo">
                        <Card>
                            <CardHeader>
                                <CardTitle>SEO Settings</CardTitle>
                                <CardDescription>
                                    Optimize your website for search engines
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="metaTitle">Page Title</Label>
                                    <Input
                                        id="metaTitle"
                                        {...form.register('metaTitle')}
                                        placeholder="Ceylon Paradise Resort | Luxury Beachfront Hotel"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Appears in browser tabs and search results (50-60 characters recommended)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="metaDescription">Meta Description</Label>
                                    <Textarea
                                        id="metaDescription"
                                        {...form.register('metaDescription')}
                                        placeholder="Experience luxury and serenity at Ceylon Paradise Resort. Beachfront rooms, world-class dining, and unforgettable Sri Lankan hospitality."
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Appears in search results (150-160 characters recommended)
                                    </p>
                                </div>

                                <Separator />

                                {/* Favicon */}
                                <div className="space-y-2">
                                    <Label>Favicon</Label>
                                    <ImageUpload
                                        value={form.watch('faviconUrl') ? [form.watch('faviconUrl')!] : []}
                                        onChange={(url) => form.setValue('faviconUrl', url)}
                                        onRemove={() => form.setValue('faviconUrl', '')}
                                        aspectRatio="square"
                                        placeholder="Upload favicon (32x32 or 64x64)"
                                    />
                                </div>

                                {/* Footer */}
                                <div className="space-y-2">
                                    <Label htmlFor="footerText">Footer Copyright Text</Label>
                                    <Input
                                        id="footerText"
                                        {...form.register('footerText')}
                                        placeholder="© 2025 Ceylon Paradise Resort. All rights reserved."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </form>
        </div>
    );
}
