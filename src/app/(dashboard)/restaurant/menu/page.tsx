"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, RefreshCw, Pizza, Search, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface MenuItem {
    id: string;
    name: string;
    category: string;
    salePrice: number;
    description: string;
    images: string[];
    isActive: boolean;
}

export default function RestaurantMenuPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        category: 'Main Course',
        salePrice: '',
        description: '',
        image: '',
    });

    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/restaurant/menu');
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Error fetching menu items:', error);
            toast.error('Failed to load menu items');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let finalImageUrl = formData.image;

            // If the image is a fresh local Base64 upload, push it to our internal Cloudinary API wrapper
            if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
                toast.loading('Uploading image securely to Cloudinary...', { id: 'upload-toast' });

                try {
                    // Convert base64 back to blob for FormData
                    const resBlob = await fetch(finalImageUrl);
                    const blob = await resBlob.blob();

                    const uploadData = new FormData();
                    uploadData.append('file', blob, 'menu-item-image.jpg');
                    uploadData.append('folder', 'restaurant-menu');

                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: uploadData
                    });

                    if (!uploadRes.ok) throw new Error("Backend upload failed");

                    const uploadJson = await uploadRes.json();
                    if (uploadJson.success && uploadJson.url) {
                        finalImageUrl = uploadJson.url;
                    } else {
                        throw new Error("Invalid response from upload API");
                    }
                    toast.dismiss('upload-toast');
                } catch (e) {
                    console.error("Upload error", e);
                    toast.dismiss('upload-toast');
                    toast.error('Image upload failed, continuing without image.');
                    finalImageUrl = ''; // Proceed without crashing the whole form
                }
            }

            const payload: any = {
                ...formData,
                salePrice: Number(formData.salePrice),
                images: finalImageUrl ? [finalImageUrl] : [],
            };
            if (!payload.id) delete payload.id;

            const method = formData.id ? 'PUT' : 'POST';

            const res = await fetch('/api/restaurant/menu', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(`Menu item ${formData.id ? 'updated' : 'created'} successfully!`);
                setIsFormOpen(false);
                setFormData({ id: '', name: '', category: 'Main Course', salePrice: '', description: '', image: '' });
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || `Failed to ${formData.id ? 'update' : 'create'} item`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            toast.dismiss('upload-toast');
            toast.error('Something went wrong during the upload process');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item: MenuItem) => {
        setFormData({
            id: item.id,
            name: item.name,
            category: item.category,
            salePrice: item.salePrice.toString(),
            description: item.description,
            image: item.images?.[0] || '',
        });
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this menu item?')) return;
        try {
            const res = await fetch(`/api/restaurant/menu?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success('Item deleted successfully');
                fetchData();
            } else {
                toast.error('Failed to delete item');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Something went wrong');
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <span className="p-2 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20 text-white">
                            <Pizza className="h-6 w-6" />
                        </span>
                        Menu Creator Studio
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Design and manage your restaurant's digital menu.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={refreshing}
                        className="h-11 border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm "
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Sync Data
                    </Button>
                    <Button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="h-11 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02]"
                    >
                        {isFormOpen ? 'Close Studio' : (
                            <><Plus className="mr-2 h-4 w-4" /> New Menu Item</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className={`grid gap-8 ${isFormOpen ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>

                {/* Form Panel (Slides in when open) */}
                {isFormOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-white/20 shadow-xl sticky top-6">
                            <CardHeader>
                                <CardTitle>Add New Dish</CardTitle>
                                <CardDescription>Enter details and upload an appetizing photo.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Item Name</Label>
                                        <Input
                                            required
                                            placeholder="e.g. Signature Chicken Kottu"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="Main Course">Main Course</option>
                                            <option value="Kottu">Kottu</option>
                                            <option value="Rice">Rice</option>
                                            <option value="Beverages">Beverages</option>
                                            <option value="Desserts">Desserts</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Price (LKR)</Label>
                                        <Input
                                            required
                                            type="number"
                                            min="0"
                                            placeholder="1500"
                                            value={formData.salePrice}
                                            onChange={e => setFormData({ ...formData, salePrice: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input
                                            placeholder="Spicy, vegetarian, allergens..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Item Image</Label>
                                        <div className="flex items-center gap-4">
                                            {formData.image ? (
                                                <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                                                    <img src={formData.image} alt="Preview" className="object-cover w-full h-full" />
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400">
                                                    <ImageIcon className="h-8 w-8" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 mt-4" disabled={isSubmitting}>
                                        {isSubmitting ? 'Saving...' : 'Add to Menu'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Grid Display */}
                <div className={isFormOpen ? 'lg:col-span-2' : 'col-span-1'}>
                    <div className="mb-6 flex gap-4 bg-white/50 dark:bg-gray-900/50 p-2 rounded-xl backdrop-blur-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search menu items..."
                                className="pl-10 border-none bg-transparent shadow-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading menu layout...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed text-gray-500">
                            <Pizza className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-lg">No items found in the menu.</p>
                            <p className="text-sm">Click "New Menu Item" to start building your menu.</p>
                        </div>
                    ) : (
                        <div className={`grid gap-4 sm:gap-6 ${isFormOpen ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                            {filteredItems.map((item, index) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={item.id}
                                >
                                    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                                        {/* Image Section */}
                                        <div className="h-48 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                                            {item.images?.[0] ? (
                                                <img
                                                    src={item.images[0]}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400">
                                                    <Pizza className="h-12 w-12 opacity-50" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3">
                                                <Badge className="bg-white/90 text-black backdrop-blur-md hover:bg-white shadow-sm border-0 font-bold">
                                                    Rs. {item.salePrice}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="mb-1 text-xs font-medium text-orange-600 uppercase tracking-wider">
                                                {item.category}
                                            </div>
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight mb-2">
                                                {item.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 line-clamp-2 mt-auto">
                                                {item.description}
                                            </p>
                                        </div>

                                        {/* Actions (Hover) */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                            <Button size="icon" variant="secondary" className="rounded-full shadow-lg" onClick={() => handleEdit(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" className="rounded-full shadow-lg" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
