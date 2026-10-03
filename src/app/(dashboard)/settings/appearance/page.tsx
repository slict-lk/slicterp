'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Palette, Moon, Sun, Monitor, Eye, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AppearancePage() {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [accentColor, setAccentColor] = useState('blue');
    const [fontSize, setFontSize] = useState('medium');
    const [compactMode, setCompactMode] = useState(false);
    const [animations, setAnimations] = useState(true);
    const [sidebar, setSidebar] = useState('default');

    useEffect(() => {
        // Load saved preferences from localStorage
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
        const savedAccentColor = localStorage.getItem('accentColor') || 'blue';
        const savedFontSize = localStorage.getItem('fontSize') || 'medium';
        const savedCompactMode = localStorage.getItem('compactMode') === 'true';
        const savedAnimations = localStorage.getItem('animations') !== 'false';
        const savedSidebar = localStorage.getItem('sidebar') || 'default';

        setTheme(savedTheme);
        setAccentColor(savedAccentColor);
        setFontSize(savedFontSize);
        setCompactMode(savedCompactMode);
        setAnimations(savedAnimations);
        setSidebar(savedSidebar);

        applyTheme(savedTheme);
    }, []);

    const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
        const root = document.documentElement;

        if (newTheme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.toggle('dark', systemTheme === 'dark');
        } else {
            root.classList.toggle('dark', newTheme === 'dark');
        }
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    const handleAccentColorChange = (color: string) => {
        setAccentColor(color);
        localStorage.setItem('accentColor', color);
        // Apply accent color to root
        document.documentElement.style.setProperty('--primary', getAccentColorValue(color));
    };

    const handleFontSizeChange = (size: string) => {
        setFontSize(size);
        localStorage.setItem('fontSize', size);
        document.documentElement.style.fontSize = getFontSizeValue(size);
    };

    const handleCompactModeChange = (enabled: boolean) => {
        setCompactMode(enabled);
        localStorage.setItem('compactMode', enabled.toString());
    };

    const handleAnimationsChange = (enabled: boolean) => {
        setAnimations(enabled);
        localStorage.setItem('animations', enabled.toString());
        document.documentElement.style.setProperty('--animation-duration', enabled ? '0.3s' : '0s');
    };

    const handleSidebarChange = (style: string) => {
        setSidebar(style);
        localStorage.setItem('sidebar', style);
    };

    const getAccentColorValue = (color: string): string => {
        const colors: Record<string, string> = {
            blue: '221.2 83.2% 53.3%',
            green: '142.1 76.2% 36.3%',
            purple: '262.1 83.3% 57.8%',
            red: '0 84.2% 60.2%',
            orange: '24.6 95% 53.1%',
            pink: '330.4 81.2% 60.4%',
        };
        return colors[color] || colors.blue;
    };

    const getFontSizeValue = (size: string): string => {
        const sizes: Record<string, string> = {
            small: '14px',
            medium: '16px',
            large: '18px',
        };
        return sizes[size] || sizes.medium;
    };

    const resetToDefaults = () => {
        handleThemeChange('system');
        handleAccentColorChange('blue');
        handleFontSizeChange('medium');
        handleCompactModeChange(false);
        handleAnimationsChange(true);
        handleSidebarChange('default');
    };

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
            {/* Premium Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Appearance</h1>
                    <p className="text-slate-300 text-lg">Customize the look and feel of your workspace.</p>
                    <div className="flex gap-4 mt-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><Palette className="h-4 w-4" /> Theme: <span className="text-white capitalize">{theme}</span></span>
                        <span className="flex items-center gap-1"><Sparkles className="h-4 w-4" /> Animations: {animations ? 'On' : 'Off'}</span>
                    </div>
                </div>

                <div className="flex gap-4 relative z-10">
                    <Button variant="outline" onClick={resetToDefaults} className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-sm">
                        <RefreshCw className="mr-2 h-4 w-4" /> Reset Defaults
                    </Button>
                </div>

                {/* Background Pattern */}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Theme Selection */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            Theme Preference
                        </CardTitle>
                        <CardDescription>Choose how the interface appears to you.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: 'light', icon: Sun, label: 'Light Mode', desc: 'Clean and bright' },
                                { id: 'dark', icon: Moon, label: 'Dark Mode', desc: 'Easy on the eyes' },
                                { id: 'system', icon: Monitor, label: 'System', desc: 'Matches device settings' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleThemeChange(item.id as any)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200",
                                        theme === item.id
                                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-md'
                                            : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700'
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-8 w-8 mb-3 transition-colors",
                                        theme === item.id ? 'text-blue-600' : 'text-slate-400'
                                    )} />
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                                    <span className="text-xs text-slate-500 mt-1">{item.desc}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Accent Color */}
                <Card>
                    <CardHeader>
                        <CardTitle>Accent Color</CardTitle>
                        <CardDescription>Select your primary brand color.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {[
                                { name: 'blue', color: 'bg-blue-500' },
                                { name: 'green', color: 'bg-green-500' },
                                { name: 'purple', color: 'bg-purple-500' },
                                { name: 'red', color: 'bg-red-500' },
                                { name: 'orange', color: 'bg-orange-500' },
                                { name: 'pink', color: 'bg-pink-500' },
                            ].map((colorOption) => (
                                <button
                                    key={colorOption.name}
                                    onClick={() => handleAccentColorChange(colorOption.name)}
                                    className={cn(
                                        "h-12 w-12 rounded-full transition-all duration-300 relative",
                                        colorOption.color,
                                        accentColor === colorOption.name ? 'scale-110 ring-4 ring-offset-2 ring-blue-200 dark:ring-blue-900' : 'hover:scale-105 opacity-80 hover:opacity-100'
                                    )}
                                    aria-label={`Select ${colorOption.name} color`}
                                >
                                    {accentColor === colorOption.name && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-2 w-2 bg-white rounded-full" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Display Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Interface Density
                        </CardTitle>
                        <CardDescription>Adjust spacing and sizing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="compact">Compact Mode</Label>
                                <p className="text-sm text-slate-500">Reduce padding for higher data density</p>
                            </div>
                            <Switch id="compact" checked={compactMode} onCheckedChange={handleCompactModeChange} />
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="fontSize">Font Size</Label>
                            <Select value={fontSize} onValueChange={handleFontSizeChange}>
                                <SelectTrigger id="fontSize">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="small">Small (14px)</SelectItem>
                                    <SelectItem value="medium">Medium (16px)</SelectItem>
                                    <SelectItem value="large">Large (18px)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Animations */}
                <Card className="col-span-2 md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Motion
                        </CardTitle>
                        <CardDescription>Manage UI transitions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="animations">Enable Animations</Label>
                                <p className="text-sm text-slate-500">Smooth transitions between pages</p>
                            </div>
                            <Switch id="animations" checked={animations} onCheckedChange={handleAnimationsChange} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
