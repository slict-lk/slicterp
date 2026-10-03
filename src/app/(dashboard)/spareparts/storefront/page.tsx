"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Upload, Plus, Trash2, Image as ImageIcon, Globe, Layout, Palette, Wrench } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface SparePartsConfig {
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
    address?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    // New Settings Fields
    aboutUs?: {
        story?: string;
        mission?: string;
        stats?: Array<{ value: string; label: string; icon: string }>;
        values?: Array<{ title: string; desc: string }>;
    };
    services?: Array<{
        title: string;
        description: string;
        icon: string;
        linkText: string;
        linkUrl: string;
    }>;
    businessHours?: {
        text?: string;
    };
    mapUrl?: string;
    whatsappNumber?: string;
    linkedinUrl?: string;
}

interface HeroSlide {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    link?: string;
}

interface Banner {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    link?: string;
    bgColor?: string;
    size: 'large' | 'medium' | 'small';
}

interface FeaturedCategory {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
}

export default function StorefrontManagerPage() {
    const [config, setConfig] = useState<SparePartsConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const { register, handleSubmit, setValue, watch, reset } = useForm<SparePartsConfig>();

    // Fetch Config on Load
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/spareparts/config');
            const data = await res.json();
            if (data?.id) {
                setConfig(data);
                reset(data);
            }
        } catch (error) {
            toast.error('Failed to load storefront config');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: SparePartsConfig) => {
        setSaving(true);
        try {
            const res = await fetch('/api/spareparts/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                toast.success('Storefront updated successfully');
                fetchConfig(); // Refresh
            } else {
                toast.error('Failed to update storefront');
            }
        } catch (error) {
            toast.error('Error saving changes');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof SparePartsConfig | 'hero' | 'banner' | 'category', index?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'spareparts'); // Organize uploads

        const promise = fetch('/api/upload', {
            method: 'POST',
            body: formData,
        }).then(async (res) => {
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data.url;
        });

        toast.promise(promise, {
            loading: 'Uploading and converting to WebP...',
            success: (url) => {
                if (fieldName === 'logoUrl') {
                    setValue('logoUrl', url, { shouldDirty: true });
                } else if (fieldName === 'hero' && config) {
                    const newSlides = [...(watch('heroSlides') || [])];
                    if (index !== undefined && newSlides[index]) {
                        newSlides[index].imageUrl = url;
                        setValue('heroSlides', newSlides, { shouldDirty: true });
                    }
                } else if (fieldName === 'category') {
                    const newCats = [...(watch('featuredCategories') || [])];
                    if (index !== undefined && newCats[index]) {
                        newCats[index].imageUrl = url;
                        setValue('featuredCategories', newCats, { shouldDirty: true });
                    }
                } else if (fieldName === 'banner') {
                    const newBanners = [...(watch('promoBanners') || [])];
                    if (index !== undefined && newBanners[index]) {
                        newBanners[index].imageUrl = url;
                        setValue('promoBanners', newBanners, { shouldDirty: true });
                    }
                }
                return 'Image uploaded successfully';
            },
            error: 'Upload failed',
        });
    };

    const addNewSlide = () => {
        const currentSlides = watch('heroSlides') || [];
        setValue('heroSlides', [
            ...currentSlides,
            { id: Date.now().toString(), title: 'New Slide', imageUrl: '', link: '#' }
        ]);
    };

    const removeSlide = (index: number) => {
        const currentSlides = watch('heroSlides') || [];
        setValue('heroSlides', currentSlides.filter((_, i) => i !== index));
    };

    const addNewCategory = () => {
        const currentCats = watch('featuredCategories') || [];
        setValue('featuredCategories', [
            ...currentCats,
            { id: Date.now().toString(), name: 'New Category', slug: 'new-category', imageUrl: '' }
        ]);
    };

    const removeCategory = (index: number) => {
        const currentCats = watch('featuredCategories') || [];
        setValue('featuredCategories', currentCats.filter((_, i) => i !== index));
    };

    if (loading) return <div className="p-8">Loading Storefront Config...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Storefront Manager</h1>
                    <p className="text-gray-500">Manage your e-commerce website appearance and content</p>
                </div>
                <button
                    onClick={handleSubmit(handleSave)}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
                {[
                    { id: 'general', label: 'General & Branding', icon: Palette },
                    { id: 'content', label: 'Page Content', icon: Layout },
                    { id: 'services', label: 'Services', icon: Wrench },
                    { id: 'hero', label: 'Hero Slider', icon: Layout },
                    { id: 'banners', label: 'Promo Banners', icon: Layout },
                    { id: 'categories', label: 'Visual Categories', icon: ImageIcon },
                    { id: 'contact', label: 'Contact Info', icon: Globe },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                            ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        {/* Render Icon safely */}
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="space-y-8 max-w-3xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                                    <input {...register('storeName')} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                                    <textarea {...register('tagline')} rows={3} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 transition-all" />
                                </div>
                            </div>

                            {/* Logo Upload */}
                            <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors text-center">
                                <label className="cursor-pointer block">
                                    <div className="w-32 h-32 mx-auto relative mb-4 bg-white rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
                                        {watch('logoUrl') ? (
                                            <Image src={watch('logoUrl')!} alt="Logo" fill className="object-contain p-2" />
                                        ) : (
                                            <ImageIcon className="text-gray-300 w-12 h-12" />
                                        )}
                                    </div>
                                    <span className="text-blue-600 font-medium text-sm hover:underline">Upload Logo</span>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG (Auto WebP)</p>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" {...register('primaryColor')} className="w-12 h-12 p-1 rounded cursor-pointer" />
                                    <input {...register('primaryColor')} className="px-4 py-2 rounded-lg border border-gray-200 w-32 uppercase" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" {...register('secondaryColor')} className="w-12 h-12 p-1 rounded cursor-pointer" />
                                    <input {...register('secondaryColor')} className="px-4 py-2 rounded-lg border border-gray-200 w-32 uppercase" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PAGE CONTENT TAB */}
                {activeTab === 'content' && (
                    <div className="space-y-8 max-w-4xl">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold">About Us Page</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Our Story</label>
                                    <textarea
                                        {...register('aboutUs.story')}
                                        rows={6}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 transition-all font-sans text-sm"
                                        placeholder="Tell your customers about your journey..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mission Statement</label>
                                    <textarea
                                        {...register('aboutUs.mission')}
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 transition-all font-sans text-sm"
                                        placeholder="Our mission is to..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* About Us Stats */}
                        <div className="space-y-4 pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold">Key Stats</h3>
                                <div className="text-xs text-gray-500">Edit values displayed on About page</div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Value</label>
                                            <input {...register(`aboutUs.stats.${i}.value` as any)} placeholder="10k+" className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Label</label>
                                            <input {...register(`aboutUs.stats.${i}.label` as any)} placeholder="Customers" className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm" />
                                        </div>
                                        <input type="hidden" {...register(`aboutUs.stats.${i}.icon` as any)} value={['Users', 'Award', 'Truck', 'HeadphonesIcon'][i]} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* About Us Values */}
                        <div className="space-y-4 pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold">Core Values <span className="text-sm font-normal text-gray-500">(Why Choose Us)</span></h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                                            <input {...register(`aboutUs.values.${i}.title` as any)} placeholder="Quality" className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                                            <textarea {...register(`aboutUs.values.${i}.desc` as any)} rows={4} placeholder="Description..." className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* SERVICES TAB */}
                {activeTab === 'services' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">Services</h3>
                                <p className="text-sm text-gray-500">Manage the services displayed on your Services page.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = watch('services') || [];
                                    setValue('services' as any, [...current, { title: 'New Service', description: '', icon: 'Wrench', linkText: 'Learn More', linkUrl: '#' }]);
                                }}
                                className="text-sm flex items-center gap-1 text-blue-600 font-medium hover:underline"
                            >
                                <Plus size={16} /> Add Service
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {(watch('services' as any) || []).map((service: any, index: number) => (
                                <div key={index} className="flex gap-6 p-6 border border-gray-100 rounded-xl bg-gray-50 relative group">
                                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                                        {/* Simple Icon Selector Visualization */}
                                        <div className="text-2xl text-blue-600 font-bold">
                                            {service.icon === 'Search' && '🔍'}
                                            {service.icon === 'Car' && '🚗'}
                                            {service.icon === 'Wrench' && '🔧'}
                                            {service.icon === 'PenTool' && '🖊️'}
                                            {!['Search', 'Car', 'Wrench', 'PenTool'].includes(service.icon) && '★'}
                                        </div>
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Service Title</label>
                                            <input {...register(`services.${index}.title` as any)} className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm font-medium" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                                            <textarea {...register(`services.${index}.description` as any)} rows={2} className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Button Text</label>
                                            <input {...register(`services.${index}.linkText` as any)} className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Link URL</label>
                                            <input {...register(`services.${index}.linkUrl` as any)} className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Icon</label>
                                            <select {...register(`services.${index}.icon` as any)} className="w-full mt-1 px-3 py-2 bg-white rounded border border-gray-200 text-sm">
                                                <option value="Wrench">Wrench (Repair)</option>
                                                <option value="Car">Car (Special Orders)</option>
                                                <option value="Search">Search (Consultation)</option>
                                                <option value="PenTool">Pen (Wholesale)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch('services' as any) || [];
                                            setValue('services' as any, current.filter((_: any, i: number) => i !== index));
                                        }}
                                        className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* HERO SLIDER TAB */}
                {activeTab === 'hero' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold">Hero Slides</h3>
                            <button type="button" onClick={addNewSlide} className="text-sm flex items-center gap-1 text-blue-600 font-medium hover:underline">
                                <Plus size={16} /> Add Slide
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {(watch('heroSlides') || []).map((slide, index) => (
                                <div key={index} className="flex gap-6 p-6 border border-gray-100 rounded-xl bg-gray-50 relative group">
                                    {/* Image Upload Area */}
                                    <div className="w-48 h-32 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center relative overflow-hidden shrink-0">
                                        {slide.imageUrl ? (
                                            <Image src={slide.imageUrl} alt="Slide" fill className="object-cover" />
                                        ) : (
                                            <span className="text-xs text-gray-400">No Image</span>
                                        )}
                                        <label className="absolute inset-0 bg-black/0 hover:bg-black/10 cursor-pointer transition-colors flex items-center justify-center">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'hero', index)} />
                                            <Upload className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                        </label>
                                    </div>

                                    {/* Inputs */}
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-medium text-gray-500">Title</label>
                                            <input
                                                {...register(`heroSlides.${index}.title` as const)}
                                                className="w-full mt-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                                placeholder="Big Sale!"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Subtitle (Optional)</label>
                                            <input
                                                {...register(`heroSlides.${index}.subtitle` as const)}
                                                className="w-full mt-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                                placeholder="Up to 50% off"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Link URL</label>
                                            <input
                                                {...register(`heroSlides.${index}.link` as const)}
                                                className="w-full mt-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                                placeholder="/products/sale"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeSlide(index)}
                                        className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PROMO BANNERS TAB */}
                {activeTab === 'banners' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold">Promo Banners</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = watch('promoBanners') || [];
                                    setValue('promoBanners', [
                                        ...current,
                                        { id: Date.now().toString(), title: 'New Banner', subtitle: 'Subtitle', imageUrl: '', link: '#', bgColor: '#1E3A5F', size: 'medium' }
                                    ]);
                                }}
                                className="text-sm flex items-center gap-1 text-blue-600 font-medium hover:underline"
                            >
                                <Plus size={16} /> Add Banner
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {(watch('promoBanners') || []).map((banner, index) => (
                                <div key={index} className="flex gap-6 p-6 border border-gray-100 rounded-xl bg-gray-50 relative group">
                                    {/* Image Upload Area */}
                                    <div className="w-32 h-32 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center relative overflow-hidden shrink-0">
                                        {banner.imageUrl ? (
                                            <Image src={banner.imageUrl} alt="Banner" fill className="object-cover" />
                                        ) : (
                                            <span className="text-xs text-gray-400">No Image</span>
                                        )}
                                        <label className="absolute inset-0 bg-black/0 hover:bg-black/10 cursor-pointer transition-colors flex items-center justify-center">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner', index)} />
                                            <Upload className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                        </label>
                                    </div>

                                    {/* Inputs */}
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Title</label>
                                            <input
                                                {...register(`promoBanners.${index}.title` as const)}
                                                className="w-full mt-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                                placeholder="Car Audio"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Subtitle</label>
                                            <input
                                                {...register(`promoBanners.${index}.subtitle` as any)} // Using any slightly to avoid strict TS if interface mismatch
                                                className="w-full mt-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                                placeholder="Super Natural Sound"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Link URL</label>
                                            <input
                                                {...register(`promoBanners.${index}.link` as const)}
                                                className="w-full mt-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                                placeholder="/category/audio"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Background Color</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="color"
                                                    {...register(`promoBanners.${index}.bgColor` as any)}
                                                    className="w-8 h-8 p-0.5 rounded border border-gray-200 cursor-pointer"
                                                />
                                                <input
                                                    {...register(`promoBanners.${index}.bgColor` as any)}
                                                    className="flex-1 px-3 py-1.5 rounded border border-gray-200 text-sm uppercase"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch('promoBanners') || [];
                                            setValue('promoBanners', current.filter((_, i) => i !== index));
                                        }}
                                        className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CATEGORIES TAB */}
                {activeTab === 'categories' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">Featured Categories</h3>
                                <p className="text-sm text-gray-500">Add visual categories for the homepage grid</p>
                            </div>
                            <button type="button" onClick={addNewCategory} className="text-sm flex items-center gap-1 text-blue-600 font-medium hover:underline">
                                <Plus size={16} /> Add Category
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(watch('featuredCategories') || []).map((cat, index) => (
                                <div key={index} className="flex gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50 relative group">
                                    {/* Image Upload Area */}
                                    <div className="w-24 h-24 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center relative overflow-hidden shrink-0">
                                        {cat.imageUrl ? (
                                            <Image src={cat.imageUrl} alt="Category" fill className="object-cover" />
                                        ) : (
                                            <span className="text-xs text-center text-gray-400 p-2">Upload Icon/Image</span>
                                        )}
                                        <label className="absolute inset-0 bg-black/0 hover:bg-black/10 cursor-pointer transition-colors flex items-center justify-center">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'category', index)} />
                                            <Upload className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                        </label>
                                    </div>

                                    {/* Inputs */}
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Name</label>
                                            <input
                                                {...register(`featuredCategories.${index}.name` as const)}
                                                className="w-full mt-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                                placeholder="Brakes"
                                                onChange={(e) => {
                                                    // Auto-slug
                                                    setValue(`featuredCategories.${index}.name`, e.target.value);
                                                    setValue(`featuredCategories.${index}.slug`, e.target.value.toLowerCase().replace(/\s+/g, '-'));
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Slug (Auto)</label>
                                            <input
                                                {...register(`featuredCategories.${index}.slug` as const)}
                                                className="w-full mt-1 px-3 py-1.5 rounded border border-gray-200 text-xs bg-gray-100 text-gray-500"
                                                readOnly
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeCategory(index)}
                                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CONTACT TAB */}
                {activeTab === 'contact' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input {...register('contactEmail')} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input {...register('contactPhone')} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                            <input {...register('whatsappNumber')} placeholder="+94..." className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours Text</label>
                            <input {...register('businessHours.text')} placeholder="Mon-Sat: 9am - 6pm" className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <textarea {...register('address')} rows={2} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Embed URL</label>
                            <input {...register('mapUrl')} placeholder="https://www.google.com/maps/embed?..." className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                            <p className="text-xs text-gray-400 mt-1">Paste the 'Embed a map' HTML src only.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                            <input {...register('facebookUrl')} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                            <input {...register('instagramUrl')} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                            <input {...register('linkedinUrl')} className="w-full px-4 py-2 rounded-lg border border-gray-200" />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
