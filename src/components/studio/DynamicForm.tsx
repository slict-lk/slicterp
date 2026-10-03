"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, FileIcon, ImageIcon } from 'lucide-react';

export interface DynamicField {
    id?: string;
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'file' | 'image' | 'json' | 'email' | 'url' | 'phone' | 'currency' | 'percentage' | 'richtext';
    required?: boolean;
    options?: string | string[];
    defaultValue?: any;
    placeholder?: string;
}

interface DynamicFormProps {
    fields: DynamicField[];
    defaultValues?: Record<string, any>;
    onSubmit: (data: any) => void;
    isLoading?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
}

// Generate Zod schema dynamically based on field configuration
function generateZodSchema(fields: DynamicField[]) {
    const schemaShape: Record<string, z.ZodTypeAny> = {};

    fields.forEach(field => {
        let validator: z.ZodTypeAny;

        switch (field.type) {
            case 'text':
            case 'select':
            case 'richtext':
                validator = z.string();
                if (field.required) {
                    validator = (validator as z.ZodString).min(1, `${field.label} is required`);
                } else {
                    validator = validator.optional().or(z.literal(''));
                }
                break;
            case 'email':
                validator = z.string().email('Invalid email address');
                if (!field.required) validator = validator.optional().or(z.literal(''));
                break;
            case 'url':
                validator = z.string().url('Invalid URL');
                if (!field.required) validator = validator.optional().or(z.literal(''));
                break;
            case 'phone':
                validator = z.string(); // Custom regex could be added
                if (!field.required) validator = validator.optional().or(z.literal(''));
                break;
            case 'number':
            case 'currency':
            case 'percentage':
                validator = z.coerce.number();
                if (!field.required) {
                    validator = validator.optional();
                }
                break;
            case 'boolean':
                validator = z.boolean().default(false);
                break;
            case 'json':
                validator = z.string().optional();
                break;
            case 'file':
            case 'image':
                validator = z.string();
                if (field.required) {
                    validator = (validator as z.ZodString).min(1, `${field.label} is required`);
                } else {
                    validator = validator.optional().or(z.literal(''));
                }
                break;
            case 'date':
                validator = z.string().or(z.date());
                if (!field.required) {
                    validator = validator.optional();
                }
                break;
            default:
                validator = z.any();
        }

        schemaShape[field.name] = validator;
    });

    return z.object(schemaShape);
}

// Cloudinary file/image upload field
function FileUploadField({ fieldName, fieldLabel, fieldType, value, onChange }: {
    fieldName: string;
    fieldLabel: string;
    fieldType: 'file' | 'image';
    value: string;
    onChange: (url: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const acceptTypes = fieldType === 'image'
        ? 'image/jpeg,image/png,image/webp,image/svg+xml'
        : 'image/jpeg,image/png,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain';

    const handleUpload = useCallback(async (file: File) => {
        setUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('field', fieldName);
            formData.append('folder', 'studio-uploads');

            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            onChange(data.url);
        } catch (err: any) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, [fieldName, onChange]);

    return (
        <div className="space-y-2">
            {value ? (
                <div className="flex items-center gap-3 border rounded-md p-3">
                    {fieldType === 'image' && value.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i) ? (
                        <img src={value} alt={fieldLabel} className="h-16 w-16 rounded object-cover" />
                    ) : (
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">
                        {value.split('/').pop()?.split('?')[0] || 'View file'}
                    </a>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => !uploading && inputRef.current?.click()}
                >
                    {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : fieldType === 'image' ? (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                        {uploading ? 'Uploading...' : `Click to upload ${fieldType === 'image' ? 'an image' : 'a file'}`}
                    </span>
                </div>
            )}
            <input
                ref={inputRef}
                type="file"
                accept={acceptTypes}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = '';
                }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

export function DynamicForm({ fields, defaultValues = {}, onSubmit, isLoading = false, submitLabel = "Save", onCancel }: DynamicFormProps) {

    const formSchema = generateZodSchema(fields);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: fields.reduce((acc, field) => {
            acc[field.name] = defaultValues[field.name] ?? (field.type === 'boolean' ? false : field.type === 'multiselect' ? [] : '');
            return acc;
        }, {} as any)
    });

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fields.map((field) => (
                        <FormField
                            key={field.name}
                            control={form.control}
                            name={field.name}
                            render={({ field: formField }) => {
                                return (
                                    <FormItem className={field.type === 'boolean' ? 'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm h-full' : ''}>

                                        {field.type !== 'boolean' && (
                                            <FormLabel>
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </FormLabel>
                                        )}

                                        <FormControl>
                                            {/* Field Type Routing */}
                                            {field.type === 'text' || field.type === 'email' || field.type === 'url' || field.type === 'phone' ? (
                                                <Input type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} {...formField} />
                                            ) : field.type === 'number' || field.type === 'currency' || field.type === 'percentage' ? (
                                                <div className="relative">
                                                    {field.type === 'currency' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>}
                                                    <Input type="number" className={field.type === 'currency' ? 'pl-7' : ''} placeholder="0" {...formField} />
                                                    {field.type === 'percentage' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>}
                                                </div>
                                            ) : field.type === 'boolean' ? (
                                                <div className="flex items-center gap-3 w-full">
                                                    <Checkbox
                                                        checked={formField.value}
                                                        onCheckedChange={formField.onChange}
                                                    />
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>{field.label}</FormLabel>
                                                    </div>
                                                </div>
                                            ) : field.type === 'select' ? (
                                                <Select onValueChange={formField.onChange} value={formField.value || ''}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={`Select ${field.label}`} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(Array.isArray(field.options) ? field.options : (typeof field.options === 'string' ? field.options.split(',').map(s => s.trim()) : [])).map((opt: string) => (
                                                            <SelectItem key={opt} value={opt}>
                                                                {opt}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : field.type === 'multiselect' ? (
                                                <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-auto">
                                                    {(Array.isArray(field.options) ? field.options : (typeof field.options === 'string' ? field.options.split(',').map(s => s.trim()) : [])).map((opt: string) => {
                                                        const selected: string[] = Array.isArray(formField.value) ? formField.value : [];
                                                        return (
                                                            <div key={opt} className="flex items-center gap-2">
                                                                <Checkbox
                                                                    checked={selected.includes(opt)}
                                                                    onCheckedChange={(checked) => {
                                                                        const next = checked
                                                                            ? [...selected, opt]
                                                                            : selected.filter(v => v !== opt);
                                                                        formField.onChange(next);
                                                                    }}
                                                                />
                                                                <span className="text-sm">{opt}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {!(Array.isArray(field.options) ? field.options : []).length && (
                                                        <p className="text-xs text-slate-400">No options configured</p>
                                                    )}
                                                </div>
                                            ) : field.type === 'json' || field.type === 'richtext' ? (
                                                <Textarea placeholder={field.placeholder || '...'} {...formField} />
                                            ) : field.type === 'file' || field.type === 'image' ? (
                                                <FileUploadField
                                                    fieldName={field.name}
                                                    fieldLabel={field.label}
                                                    fieldType={field.type}
                                                    value={formField.value || ''}
                                                    onChange={formField.onChange}
                                                />
                                            ) : field.type === 'date' ? (
                                                <Input type="datetime-local" {...formField} />
                                            ) : (
                                                <Input {...formField} />
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                );
                            }}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    {onCancel && (
                        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
