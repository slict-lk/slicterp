"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Type, Hash, Calendar, CheckSquare, List, ListFilter,
    FileBox, Code2, Mail, Link as LinkIcon, Phone, DollarSign,
    Percent, AlignLeft, ImageIcon
} from "lucide-react";

export type FieldType =
    | 'text' | 'number' | 'date' | 'boolean'
    | 'select' | 'multiselect' | 'file' | 'image' | 'json'
    | 'email' | 'url' | 'phone' | 'currency' | 'percentage' | 'richtext';

const FIELD_TYPES = [
    { value: 'text', label: 'Text (String)', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date & Time', icon: Calendar },
    { value: 'boolean', label: 'Boolean (Checkbox)', icon: CheckSquare },
    { value: 'select', label: 'Single Select', icon: List },
    { value: 'multiselect', label: 'Multiple Select', icon: ListFilter },
    { value: 'file', label: 'File Upload', icon: FileBox },
    { value: 'image', label: 'Image Upload', icon: ImageIcon },
    { value: 'json', label: 'JSON Object', icon: Code2 },
    { value: 'email', label: 'Email Address', icon: Mail },
    { value: 'url', label: 'URL/Link', icon: LinkIcon },
    { value: 'phone', label: 'Phone Number', icon: Phone },
    { value: 'currency', label: 'Currency', icon: DollarSign },
    { value: 'percentage', label: 'Percentage', icon: Percent },
    { value: 'richtext', label: 'Rich Text (HTML)', icon: AlignLeft },
];

interface FieldTypeSelectorProps {
    value: FieldType;
    onValueChange: (value: FieldType) => void;
}

export function FieldTypeSelector({ value, onValueChange }: FieldTypeSelectorProps) {
    return (
        <Select value={value} onValueChange={(val) => onValueChange(val as FieldType)}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
                {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4 text-slate-400" />
                            <span>{type.label}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
