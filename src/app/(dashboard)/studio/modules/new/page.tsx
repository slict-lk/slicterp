"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Save, Database, LayoutTemplate, Settings, CheckCircle2, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ModuleFieldEditor } from '@/components/studio/ModuleFieldEditor';
import { ModuleIconPicker } from '@/components/studio/ModuleIconPicker';
import { FieldType } from '@/components/studio/FieldTypeSelector';


interface FieldDraft {
    id: string;
    name: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string;
}

const STEPS = [
    { id: 'basics', title: 'Basic Info', icon: Database, desc: 'Name and describe your module' },
    { id: 'schema', title: 'Data Schema', icon: LayoutTemplate, desc: 'Define fields and data types' },
    { id: 'settings', title: 'Settings', icon: Settings, desc: 'Configure views and access' },
    { id: 'review', title: 'Review', icon: CheckCircle2, desc: 'Verify and create module' }
];

export default function NewModulePage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('database');
    const [isActive, setIsActive] = useState(true);

    const [fields, setFields] = useState<FieldDraft[]>([
        { id: '1', name: 'title', label: 'Title', type: 'text', required: true, options: '' }
    ]);

    const addField = () => {
        setFields([
            ...fields,
            { id: Date.now().toString(), name: `field_${fields.length + 1}`, label: 'New Field', type: 'text', required: false, options: '' }
        ]);
    };

    const removeField = (id: string) => {
        if (fields.length <= 1) return;
        setFields(fields.filter(f => f.id !== id));
    };

    const updateField = (id: string, key: keyof FieldDraft, value: any) => {
        setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const handleNext = () => {
        if (currentStep === 0 && !name.trim()) {
            toast.error('Module name is required');
            return;
        }

        // Auto-generate name from label if name is empty (basic slugify)
        if (currentStep === 1) {
            let hasError = false;
            const updatedFields = fields.map(f => {
                if (!f.label.trim()) {
                    toast.error('All fields must have a label');
                    hasError = true;
                }
                return {
                    ...f,
                    name: f.name.trim() || f.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
                };
            });
            if (hasError) return;
            setFields(updatedFields);
        }

        setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const handlePrev = () => {
        setCurrentStep(s => Math.max(s - 1, 0));
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            const mappedFields = fields.map(f => ({
                name: f.name,
                label: f.label,
                type: f.type,
                required: f.required,
                options: (f.type === 'select' || f.type === 'multiselect') && f.options
                    ? f.options.split(',').map(s => s.trim()).filter(Boolean)
                    : undefined
            }));

            const payload = {
                name: name.trim(),
                description: description.trim() || undefined,
                icon: icon || undefined,
                isActive,
                fields: mappedFields,
                schema: {
                    fields: mappedFields,
                    relations: []
                },
                views: [{ type: 'list', name: 'All Records' }]
            };

            const res = await fetch('/api/studio/modules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create module');
            }

            const created = await res.json();
            toast.success('Module created successfully');
            router.push(`/studio/modules/${created.data.id}`);

        } catch (error: any) {
            toast.error(error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8">
                    <Link href="/studio/modules">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Custom Module</h1>
                    <p className="text-sm text-slate-500">Design a new data structure in 4 simple steps.</p>
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="relative">
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-100 -translate-y-1/2 hidden sm:block"></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-4">
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = idx < currentStep;
                        const isCurrent = idx === currentStep;

                        return (
                            <div key={step.id} className="flex items-center sm:flex-col gap-3 group bg-slate-50 relative px-2">
                                <div className={cn(
                                    "h-10 w-10 flex items-center justify-center rounded-full border-2 transition-colors",
                                    isCompleted ? "bg-primary border-primary text-primary-foreground" :
                                        isCurrent ? "bg-white border-primary text-primary" :
                                            "bg-white border-slate-200 text-slate-400"
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="sm:text-center">
                                    <p className={cn(
                                        "text-sm font-semibold",
                                        isCurrent || isCompleted ? "text-slate-900" : "text-slate-500"
                                    )}>{step.title}</p>
                                    <p className="text-xs text-slate-500 hidden sm:block">{step.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Form Area */}
            <Card className="border-border/50 shadow-sm mt-8">
                <CardContent className="p-6 sm:p-10 min-h-[400px]">

                    {currentStep === 0 && (
                        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-slate-900">Basic Information</h2>
                                <p className="text-sm text-slate-500">Provide the foundational details for your new data module.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Module Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Employee Directory, Asset Tracker"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea
                                        id="desc"
                                        placeholder="What kind of data will this module store?"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="icon">Module Icon</Label>
                                    <ModuleIconPicker value={icon} onSelect={setIcon} />
                                    <p className="text-[11px] text-slate-500 italic">Select an icon that characterizes this module.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-semibold text-slate-900">Data Schema</h2>
                                    <p className="text-sm text-slate-500">Define the fields that make up a single record in this module.</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setFields([...fields, { id: Date.now().toString(), label: '', name: '', type: 'text', required: false, options: '' }])}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Field
                                </Button>
                            </div>

                            <ModuleFieldEditor fields={fields} onChange={setFields} />

                            <Button variant="ghost" className="w-full border border-dashed text-slate-500 mt-2 h-12 rounded-xl" onClick={() => setFields([...fields, { id: Date.now().toString(), label: '', name: '', type: 'text', required: false, options: '' }])}>
                                <Plus className="h-4 w-4 mr-2" /> Add Another Field
                            </Button>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-slate-900">Module Settings</h2>
                                <p className="text-sm text-slate-500">Configure how this module behaves in the system.</p>
                            </div>

                            <div className="space-y-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 hidden sm:block">
                                        <Label className="text-base">Active Status</Label>
                                        <p className="text-sm text-slate-500 max-w-sm">Disable this to hide the module from users while you continue to work on it.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">{isActive ? 'Active' : 'Draft'}</span>
                                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                                    </div>
                                </div>

                                <hr className="border-slate-200" />

                                <div className="space-y-3">
                                    <Label>Default View Settings</Label>
                                    <p className="text-sm text-slate-500">A default List View will automatically be created containing all fields.</p>

                                    <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-md">
                                        <p className="text-sm text-blue-800 text-center">
                                            Advanced workflow triggers, API access controls, and custom layouts can be configured after module creation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-2 text-center">
                                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>
                                <h2 className="text-2xl font-semibold text-slate-900">Ready to create module</h2>
                                <p className="text-sm text-slate-500">Review your configuration before initializing the database tables.</p>
                            </div>

                            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900">{name}</h3>
                                        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
                                    </div>
                                    <div className="bg-white p-2 rounded-md shadow-sm border border-slate-100">
                                        <Database className="h-5 w-5 text-indigo-500" />
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Schema fields ({fields.length})</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {fields.map(f => (
                                            <div key={f.id} className="flex flex-col p-3 rounded-md bg-slate-50 border border-slate-100">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium text-slate-900 text-sm">{f.label}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                                                        {f.type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                                                    <span className="font-mono">{f.name}</span>
                                                    {f.required ? <span className="text-red-500 font-medium">Required</span> : <span>Optional</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="px-6 py-4 bg-slate-50/50 border-t flex justify-between">
                    <Button
                        variant="outline"
                        onClick={handlePrev}
                        disabled={currentStep === 0 || isSubmitting}
                    >
                        Back
                    </Button>

                    {currentStep < STEPS.length - 1 ? (
                        <Button onClick={handleNext}>
                            Next Step <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Create Module</>
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
