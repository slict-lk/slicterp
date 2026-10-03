'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Upload,
    Link,
    X,
    Image as ImageIcon,
    Plus,
    Loader2,
    Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomImagesProps {
    value: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
}

export function RoomImages({ value = [], onChange, maxImages = 10 }: RoomImagesProps) {
    const [showUploader, setShowUploader] = useState(false);
    const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
    const [urlInput, setUrlInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        setError(null);

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'hotel-rooms');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.text();
                throw new Error(errorData || 'Upload failed');
            }

            const data = await res.json();

            if (data.url) {
                onChange([...value, data.url]);
                setShowUploader(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                throw new Error('No URL returned');
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setError('Failed to upload image. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleUrlSubmit = () => {
        if (!urlInput.trim()) {
            setError('Please enter a URL');
            return;
        }

        setError(null);
        setIsLoading(true);

        const img = new window.Image();
        img.onload = () => {
            onChange([...value, urlInput]);
            setUrlInput('');
            setShowUploader(false);
            setIsLoading(false);
        };
        img.onerror = () => {
            setError('Could not load image from URL');
            setIsLoading(false);
        };
        img.src = urlInput;
    };

    const handleRemove = (index: number) => {
        const newImages = value.filter((_, i) => i !== index);
        onChange(newImages);
    };

    const handleSetPrimary = (index: number) => {
        if (index === 0) return;
        const newImages = [...value];
        const [removed] = newImages.splice(index, 1);
        newImages.unshift(removed);
        onChange(newImages);
    };

    return (
        <div className="space-y-4">
            {/* Image Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {value.map((img, index) => (
                    <div
                        key={index}
                        className={cn(
                            "relative aspect-video rounded-lg overflow-hidden border-2 group cursor-pointer",
                            index === 0 ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                        )}
                    >
                        <img src={img} alt={`Room ${index + 1}`} className="w-full h-full object-cover" />

                        {/* Primary Badge */}
                        {index === 0 && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                Primary
                            </div>
                        )}

                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {index !== 0 && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSetPrimary(index)}
                                >
                                    Set Primary
                                </Button>
                            )}
                            <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8"
                                onClick={() => handleRemove(index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {/* Add Button */}
                {value.length < maxImages && (
                    <button
                        type="button"
                        onClick={() => setShowUploader(true)}
                        className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                    >
                        <Plus className="h-8 w-8" />
                        <span className="text-sm">Add Image</span>
                    </button>
                )}
            </div>

            {/* Upload Modal */}
            {showUploader && (
                <Card className="border-2 border-dashed">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between p-3 border-b">
                            <span className="font-medium">Add Room Image</span>
                            <Button variant="ghost" size="icon" onClick={() => setShowUploader(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'upload' | 'url')}>
                            <TabsList className="w-full rounded-none border-b">
                                <TabsTrigger value="upload" className="flex-1">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload File
                                </TabsTrigger>
                                <TabsTrigger value="url" className="flex-1">
                                    <Link className="h-4 w-4 mr-2" />
                                    Image URL
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="upload" className="m-0">
                                <div
                                    className={cn(
                                        'flex flex-col items-center justify-center p-8 cursor-pointer transition-colors',
                                        isDragging ? 'bg-primary/10' : 'hover:bg-muted/50'
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon className="h-10 w-10 text-muted-foreground mb-4" />
                                    <p className="text-sm text-muted-foreground text-center">
                                        <span className="font-medium text-primary">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileSelect(file);
                                        }}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="url" className="m-0 p-4">
                                <div className="flex gap-2">
                                    <Input
                                        type="url"
                                        placeholder="https://example.com/room-image.jpg"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                    />
                                    <Button onClick={handleUrlSubmit} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {error && (
                            <p className="text-sm text-destructive p-4 pt-0">{error}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            <p className="text-xs text-muted-foreground">
                {value.length}/{maxImages} images. First image is the primary display image.
            </p>
        </div>
    );
}
