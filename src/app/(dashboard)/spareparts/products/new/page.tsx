"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Package, Upload, Link2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function NewProductPage() {
    const router = useRouter();
        const [loading, setLoading] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [uploadMethod, setUploadMethod] = useState<'url' | 'device'>('url');

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        category: '',
        brand: '',
        salePrice: '',
        costPrice: '',
        stockQty: '',
        minStockQty: '',
        partNumber: '',
        compatibleModels: '',
        condition: 'NEW',
        taxCategoryId: '',
    });

    const [aliases, setAliases] = useState<{ aliasNumber: string; brand: string }[]>([]);
    const [taxCategories, setTaxCategories] = useState<{ id: string; name: string; rate: number }[]>([]);

    useEffect(() => {
        fetch('/api/spareparts/config/tax-categories')
            .then(res => res.ok ? res.json() : [])
            .then(setTaxCategories)
            .catch(console.error);
    }, []);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddAlias = () => {
        setAliases([...aliases, { aliasNumber: '', brand: '' }]);
    };

    const handleRemoveAlias = (index: number) => {
        setAliases(aliases.filter((_, i) => i !== index));
    };

    const handleAliasChange = (index: number, field: 'aliasNumber' | 'brand', value: string) => {
        const newAliases = [...aliases];
        newAliases[index][field] = value;
        setAliases(newAliases);
    };

    // ... existing handlers ...

    const handleAddImageUrl = () => {
        const urlToCheck = imageUrlInput.trim();
        if (!urlToCheck) return;

        try {
            new URL(urlToCheck); // Validate URL
            setImages(prev => [...prev, urlToCheck]);
            setImageUrlInput('');
        } catch (e) {
            toast.error("Invalid URL", { description: "Please enter a valid valid image URL (e.g., https://example.com/image.jpg)" });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // For now, just show a toast that upload is not yet implemented
        // In production, this would upload to a server and return URLs
        toast.success("Info", { description: "File upload requires server configuration. Please use URL input for now." });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.sku) {
            toast.error('Error', { description: 'Please fill in required fields (Name and SKU)' });
            return;
        }

        setLoading(true);
        try {
            const compatibleModelsArray = formData.compatibleModels
                ? formData.compatibleModels.split(',').map(m => m.trim())
                : [];

            const res = await fetch('/api/spareparts/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    sku: formData.sku,
                    description: formData.description || null,
                    category: formData.category || null,
                    brand: formData.brand || null,
                    salePrice: parseFloat(formData.salePrice) || 0,
                    costPrice: parseFloat(formData.costPrice) || 0,
                    stockQty: parseFloat(formData.stockQty) || 0,
                    minStockQty: parseFloat(formData.minStockQty) || 0,
                    taxCategoryId: formData.taxCategoryId || null,
                    partNumber: formData.partNumber || null,
                    compatibleModels: compatibleModelsArray,
                    condition: formData.condition || 'NEW',
                    images: images,
                    isActive: true,
                    aliases: aliases.filter(a => a.aliasNumber.trim() !== '') // Send aliases
                }),
            });

            if (res.ok) {
                toast.success('Success', { description: 'Product created successfully' });
                router.push('/spareparts/products');
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create product');
            }
        } catch (error: unknown) {
            toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to create product' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <Link href="/spareparts/products">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Products
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Package className="h-8 w-8 text-primary" />
                    Add New Product
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Create a new spare part in your inventory
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                                <CardDescription>Essential product details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Product Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="e.g., Oil Filter - Toyota Corolla"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sku">SKU *</Label>
                                        <Input
                                            id="sku"
                                            value={formData.sku}
                                            onChange={(e) => handleInputChange('sku', e.target.value)}
                                            placeholder="e.g., TOY-OIL-001"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder="Product description..."
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category</Label>
                                        <Input
                                            id="category"
                                            value={formData.category}
                                            onChange={(e) => handleInputChange('category', e.target.value)}
                                            placeholder="e.g., Filters, Engine Parts"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="brand">Brand</Label>
                                        <Input
                                            id="brand"
                                            value={formData.brand}
                                            onChange={(e) => handleInputChange('brand', e.target.value)}
                                            placeholder="e.g., Toyota, Honda"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pricing & Stock */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Pricing & Stock</CardTitle>
                                <CardDescription>Set prices and inventory levels</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="salePrice">Sale Price (LKR)</Label>
                                        <Input
                                            id="salePrice"
                                            type="number"
                                            step="0.01"
                                            value={formData.salePrice}
                                            onChange={(e) => handleInputChange('salePrice', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="taxCategoryId">Tax Category</Label>
                                        <Select
                                            value={formData.taxCategoryId || "_default"}
                                            onValueChange={(val) => handleInputChange('taxCategoryId', val === "_default" ? "" : val)}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Default Tax" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_default">Default</SelectItem>
                                                {taxCategories.map(tc => (
                                                    <SelectItem key={tc.id} value={tc.id}>
                                                        {tc.name} ({tc.rate}%)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="costPrice">Cost Price (LKR)</Label>
                                        <Input
                                            id="costPrice"
                                            type="number"
                                            step="0.01"
                                            value={formData.costPrice}
                                            onChange={(e) => handleInputChange('costPrice', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="stockQty">Stock Quantity</Label>
                                        <Input
                                            id="stockQty"
                                            type="number"
                                            step="1"
                                            value={formData.stockQty}
                                            onChange={(e) => handleInputChange('stockQty', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="minStockQty">Minimum Stock Level</Label>
                                        <Input
                                            id="minStockQty"
                                            type="number"
                                            step="1"
                                            value={formData.minStockQty}
                                            onChange={(e) => handleInputChange('minStockQty', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Automotive Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Automotive Details</CardTitle>
                                <CardDescription>Additional part information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* ... existing fields ... */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="partNumber">OEM Part Number</Label>
                                        <Input
                                            id="partNumber"
                                            value={formData.partNumber}
                                            onChange={(e) => handleInputChange('partNumber', e.target.value)}
                                            placeholder="e.g., 90915-YZZD2"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="condition">Condition</Label>
                                        <Select value={formData.condition} onValueChange={(value) => handleInputChange('condition', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NEW">New</SelectItem>
                                                <SelectItem value="USED">Used</SelectItem>
                                                <SelectItem value="REFURBISHED">Refurbished</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="compatibleModels">Compatible Models</Label>
                                    <Input
                                        id="compatibleModels"
                                        value={formData.compatibleModels}
                                        onChange={(e) => handleInputChange('compatibleModels', e.target.value)}
                                        placeholder="Comma-separated: Toyota Corolla 2020, Honda Civic 2019"
                                    />
                                    <p className="text-xs text-gray-500">Enter vehicle models separated by commas</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Replacement Part Numbers / Aliases */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Replacement Part Numbers</CardTitle>
                                    <CardDescription>Add aliases or alternative part numbers</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddAlias}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Alias
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {aliases.map((alias, index) => (
                                    <div key={index} className="flex gap-4 items-end">
                                        <div className="flex-1">
                                            <Label>Alias Number</Label>
                                            <Input
                                                value={alias.aliasNumber}
                                                onChange={(e) => handleAliasChange(index, 'aliasNumber', e.target.value)}
                                                placeholder="e.g. C-1109"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label>Brand (Optional)</Label>
                                            <Input
                                                value={alias.brand}
                                                onChange={(e) => handleAliasChange(index, 'brand', e.target.value)}
                                                placeholder="e.g. VIC"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveAlias(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {aliases.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No aliases added.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Images */}
                    <div>
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>Product Images</CardTitle>
                                <CardDescription>Upload or add image URLs</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Upload Method Toggle */}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={uploadMethod === 'url' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setUploadMethod('url')}
                                        className="flex-1"
                                    >
                                        <Link2 className="mr-2 h-4 w-4" />
                                        URL
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={uploadMethod === 'device' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setUploadMethod('device')}
                                        className="flex-1"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Device
                                    </Button>
                                </div>

                                {/* URL Input */}
                                {uploadMethod === 'url' && (
                                    <div className="space-y-2">
                                        <Label>Image URL</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={imageUrlInput}
                                                onChange={(e) => setImageUrlInput(e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddImageUrl();
                                                    }
                                                }}
                                            />
                                            <Button type="button" onClick={handleAddImageUrl} size="sm">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Device Upload */}
                                {uploadMethod === 'device' && (
                                    <div className="space-y-2">
                                        <Label>Upload from Device</Label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                )}

                                {/* Image Preview */}
                                {images.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Images ({images.length})</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {images.map((img, index) => (
                                                <div key={index} className="relative group">
                                                    <div className="aspect-square relative rounded-lg overflow-hidden border">
                                                        <Image
                                                            src={img}
                                                            alt={`Product ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => removeImage(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Submit Buttons */}
                                <div className="space-y-2 pt-4">
                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Create Product
                                            </>
                                        )}
                                    </Button>
                                    <Link href="/spareparts/products" className="block">
                                        <Button type="button" variant="outline" className="w-full">
                                            Cancel
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
