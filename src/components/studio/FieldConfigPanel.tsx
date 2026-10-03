"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FieldType } from "./FieldTypeSelector";

interface FieldConfigPanelProps {
    field: {
        id: string;
        label: string;
        name: string;
        type: FieldType;
        required: boolean;
        options?: string;
        placeholder?: string;
        defaultValue?: string;
    };
    onUpdate: (id: string, key: string, value: any) => void;
}

export function FieldConfigPanel({ field, onUpdate }: FieldConfigPanelProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500 font-bold">Placeholder</Label>
                    <Input
                        placeholder="e.g. Enter name..."
                        value={field.placeholder || ''}
                        onChange={e => onUpdate(field.id, 'placeholder', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500 font-bold">Default Value</Label>
                    <Input
                        placeholder="Optional default"
                        value={field.defaultValue || ''}
                        onChange={e => onUpdate(field.id, 'defaultValue', e.target.value)}
                    />
                </div>
            </div>

            {(field.type === 'select' || field.type === 'multiselect') && (
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500 font-bold">Options</Label>
                    <Input
                        placeholder="Option 1, Option 2, Option 3"
                        value={field.options || ''}
                        onChange={e => onUpdate(field.id, 'options', e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 italic">Separate multiple choices with commas.</p>
                </div>
            )}

            {field.type === 'number' && (
                <div className="flex gap-4">
                    <div className="space-y-1.5 flex-1">
                        <Label className="text-[10px] uppercase text-slate-500">Min</Label>
                        <Input type="number" className="h-8" value={(field as any).min ?? ''} onChange={e => onUpdate(field.id, 'min', e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-1.5 flex-1">
                        <Label className="text-[10px] uppercase text-slate-500">Max</Label>
                        <Input type="number" className="h-8" value={(field as any).max ?? ''} onChange={e => onUpdate(field.id, 'max', e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                </div>
            )}
        </div>
    );
}
