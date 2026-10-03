"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useModules, useDeleteModuleMutation } from '@/hooks/use-studio';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Database, Plus, Search, MoreHorizontal, FileEdit, Trash, Component, ArrowRight, Loader2, Play } from 'lucide-react';
import { format } from 'date-fns';

export default function ModulesListPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const { data: modules, isLoading } = useModules({ search: searchQuery });
    const deleteMutation = useDeleteModuleMutation();

    const handleDeleteModule = async (moduleId: string, moduleName: string) => {
        if (!confirm(`Are you sure you want to delete "${moduleName}"? All records will be permanently removed.`)) return;
        try {
            await deleteMutation.mutateAsync(moduleId);
            toast.success('Module deleted successfully');
        } catch (err: any) {
            toast.error('Failed to delete module: ' + err.message);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Data Modules</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage custom data structures, schema fields, and records.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild>
                        <Link href="/studio/modules/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Module
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search modules..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-md border bg-white flex-1 relative flex flex-col overflow-hidden">
                <div className="overflow-x-auto flex-1">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b relative z-10 sticky top-0">
                            <TableRow>
                                <TableHead className="w-[300px]">Module Information</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Fields</TableHead>
                                <TableHead>Records</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col justify-center items-center text-slate-500">
                                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                            <p>Loading modules...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : modules?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-[400px] text-center">
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                                                <Database className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-900 mb-1">No modules found</h3>
                                            <p className="text-sm text-slate-500 mb-6">
                                                {searchQuery
                                                    ? "We couldn't find any modules matching your search."
                                                    : "Get started by building your first custom data module."}
                                            </p>
                                            {!searchQuery && (
                                                <Button asChild>
                                                    <Link href="/studio/modules/new">
                                                        <Plus className="mr-2 h-4 w-4" /> Create First Module
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                modules?.map((mod) => (
                                    <TableRow key={mod.id} className="hover:bg-slate-50/50 group">
                                        <TableCell>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 h-8 w-8 rounded-md bg-slate-100/80 text-slate-600 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                                                    {/* Use dynamic icon if we had lucide mapping, fallback to Database for now */}
                                                    <Component className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <Link href={`/studio/modules/${mod.id}`} className="font-medium text-slate-900 hover:text-primary transition-colors">
                                                        {mod.name}
                                                    </Link>
                                                    {mod.description && (
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{mod.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={mod.isActive ? "default" : "secondary"} className={mod.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : ""}>
                                                {mod.isActive ? 'Active' : 'Draft'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600 font-medium">
                                                {mod.schema?.fields?.length || 0} fields
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {/* Would show record count here if API returned it */}
                                            <span className="text-sm text-slate-500">--</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-500 truncate block w-24">
                                                {mod.createdAt ? format(new Date(mod.createdAt), 'MMM d, yyyy') : 'Unknown'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <Link href={`/studio/modules/${mod.id}`}>
                                                        <Play className="h-4 w-4 text-slate-600" />
                                                    </Link>
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4 text-slate-600" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[160px]">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/studio/modules/${mod.id}`} className="cursor-pointer">
                                                                <Database className="mr-2 h-4 w-4 text-slate-500" /> View Records
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/studio/modules/${mod.id}`} className="cursor-pointer">
                                                                <FileEdit className="mr-2 h-4 w-4 text-slate-500" /> Edit Schema
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                                            onClick={() => handleDeleteModule(mod.id, mod.name)}
                                                        >
                                                            <Trash className="mr-2 h-4 w-4" /> Delete Module
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
