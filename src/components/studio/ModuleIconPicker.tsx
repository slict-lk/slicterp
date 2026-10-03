"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search } from "lucide-react";
import * as Icons from "lucide-react";

interface ModuleIconPickerProps {
    value: string;
    onSelect: (iconName: string) => void;
}

export function ModuleIconPicker({ value, onSelect }: ModuleIconPickerProps) {
    const [search, setSearch] = useState("");
    const iconNames = Object.keys(Icons).filter(name => {
        if (!name.toLowerCase().includes(search.toLowerCase())) return false;
        const exp = (Icons as any)[name];
        if (name === 'createLucideIcon' || name === 'icons') return false;
        if (name.endsWith('Icon')) return false; // skip duplicate aliases like PackageIcon
        return typeof exp === 'object' && exp !== null && typeof exp.render === 'function';
    }).slice(0, 50);

    const SelectedIcon = (Icons as any)[value] || Icons.HelpCircle;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 w-full justify-start h-10 px-3">
                    <SelectedIcon className="h-4 w-4 text-slate-500" />
                    <span className="truncate text-slate-700 font-medium">{value}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b flex items-center gap-2 bg-slate-50">
                    <Search className="h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search icons..."
                        className="h-8 bg-transparent border-none focus-visible:ring-0 p-0"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-5 gap-1 p-2 max-h-[300px] overflow-auto">
                    {iconNames.map(name => {
                        const Icon = (Icons as any)[name];
                        return (
                            <Button
                                key={name}
                                variant="ghost"
                                className="h-10 w-10 p-0 hover:bg-indigo-50 hover:text-indigo-600 rounded-md"
                                onClick={() => onSelect(name)}
                                title={name}
                            >
                                <Icon className="h-5 w-5" />
                            </Button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
