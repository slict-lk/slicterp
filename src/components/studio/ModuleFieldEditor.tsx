"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Trash2, Settings2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { FieldTypeSelector, FieldType } from "./FieldTypeSelector";
import { FieldConfigPanel } from "./FieldConfigPanel";
import { cn } from "@/lib/utils";

interface Field {
    id: string;
    label: string;
    name: string;
    type: FieldType;
    required: boolean;
    options?: string;
    placeholder?: string;
    defaultValue?: string;
}

interface ModuleFieldEditorProps {
    fields: Field[];
    onChange: (fields: Field[]) => void;
}

export function ModuleFieldEditor({ fields, onChange }: ModuleFieldEditorProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const updateField = (id: string, key: string, value: any) => {
        onChange(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const removeField = (id: string) => {
        onChange(fields.filter(f => f.id !== id));
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="space-y-3">
            {fields.map((field, index) => (
                <div
                    key={field.id}
                    className={cn(
                        "border rounded-xl bg-white shadow-sm transition-all duration-200",
                        expandedId === field.id ? "ring-2 ring-indigo-500/20 border-indigo-200" : "hover:border-slate-300"
                    )}
                >
                    {/* Summary Row */}
                    <div className="flex items-center gap-3 p-3">
                        <div className="cursor-grab text-slate-300 hover:text-slate-400 shrink-0">
                            <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-0">
                            <Input
                                placeholder="Field Label"
                                className="h-9 font-medium"
                                value={field.label}
                                onChange={e => updateField(field.id, 'label', e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="field_name"
                                    className="h-9 font-mono text-xs bg-slate-50"
                                    value={field.name}
                                    onChange={e => updateField(field.id, 'name', e.target.value)}
                                />
                            </div>
                            <FieldTypeSelector
                                value={field.type}
                                onValueChange={(type) => updateField(field.id, 'type', type)}
                            />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 rounded-full", expandedId === field.id ? "bg-indigo-50 text-indigo-600" : "text-slate-400")}
                                onClick={() => toggleExpand(field.id)}
                            >
                                <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500"
                                onClick={() => removeField(field.id)}
                                disabled={fields.length === 1}
                                aria-label={`Remove ${field.label || 'field'}`}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Config Panel */}
                    {expandedId === field.id && (
                        <div className="px-12 pb-5 pt-1 border-t bg-slate-50/30 rounded-b-xl animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-4 mb-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={field.required}
                                        onCheckedChange={val => updateField(field.id, 'required', val)}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Required Field</span>
                                </div>
                            </div>
                            <FieldConfigPanel field={field} onUpdate={updateField} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
