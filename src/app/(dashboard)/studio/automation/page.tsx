"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useAutomations, useToggleAutomationMutation } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Zap, Play, Settings2, Trash2, ShieldAlert, Loader2, StopCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

export default function AutomationRulesListPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: automations, isLoading } = useAutomations();
    const toggleAutomation = useToggleAutomationMutation();

    const filteredAutomations = automations?.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Automation Rules</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Legacy single-action trigger rules. Consider migrating complex logic to Workflows.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild>
                        <Link href="/studio/automation/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Rule
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search automation rules..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-md text-sm">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="font-medium">Deprecation Notice:</span>
                    <span className="hidden lg:inline">Single-action rules are being replaced by Workflows.</span>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
            ) : !filteredAutomations?.length ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-4 border border-amber-100">
                        <Zap className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No automation rules found</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-md">
                        {searchQuery
                            ? "No automation rules match your search."
                            : "Legacy automation rules allow simple IF-THEN conditions on core ERP models."}
                    </p>
                    {!searchQuery && (
                        <Button asChild>
                            <Link href="/studio/automation/new">
                                <Plus className="mr-2 h-4 w-4" /> Create First Rule
                            </Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAutomations.map(rule => (
                        <Card key={rule.id} className="flex flex-col hover:shadow-md transition-all border-slate-200">
                            <CardHeader className="pb-4 items-start justify-between flex-row">
                                <div className="flex items-center gap-3 w-4/5">
                                    <div className={`h-10 w-10 flex shrink-0 items-center justify-center rounded-lg border ${rule.isActive ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div className="truncate">
                                        <CardTitle className="text-md truncate font-semibold" title={rule.name}>
                                            <Link href={`/studio/automation/${rule.id}`} className="hover:text-primary transition-colors cursor-pointer after:absolute after:inset-0">
                                                {rule.name}
                                            </Link>
                                        </CardTitle>
                                        {rule.description && (
                                            <CardDescription className="truncate text-xs mt-0.5">
                                                {rule.description}
                                            </CardDescription>
                                        )}
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 relative z-20 shrink-0">
                                            <Settings2 className="h-4 w-4 text-slate-500" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/studio/automation/${rule.id}`} className="cursor-pointer">
                                                <Settings2 className="mr-2 h-4 w-4 text-slate-500" /> Edit Rule
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/studio/automation/${rule.id}/executions`} className="cursor-pointer">
                                                <Play className="mr-2 h-4 w-4 text-slate-500" /> View History
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Rule
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="flex-1 pb-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={rule.isActive ? "default" : "secondary"} className={rule.isActive ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : ''}>
                                            {rule.isActive ? 'Active' : 'Disabled'}
                                        </Badge>
                                        {rule.module && (
                                            <Badge variant="outline" className="text-slate-500 font-mono text-[10px]">
                                                {rule.module}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs text-slate-600 flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900 w-12">Action:</span>
                                            <span className="font-mono">{rule.action}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900 w-12">Event:</span>
                                            <span className="font-mono">{rule.event}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t py-3 flex justify-between items-center text-xs text-slate-500 relative z-20">
                                <div className="flex items-center gap-1">
                                    {rule.isActive ? <Play className="h-3 w-3 text-emerald-500" /> : <StopCircle className="h-3 w-3" />}
                                    <span>Runs: {rule.runCount || 0}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-slate-600 cursor-pointer" htmlFor={`toggle-${rule.id}`}>
                                        {rule.isActive ? 'On' : 'Off'}
                                    </Label>
                                    <Switch
                                        id={`toggle-${rule.id}`}
                                        checked={rule.isActive}
                                        onCheckedChange={(checked) => toggleAutomation.mutate({ id: rule.id, isActive: checked })}
                                        className="scale-75 origin-right"
                                    />
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
