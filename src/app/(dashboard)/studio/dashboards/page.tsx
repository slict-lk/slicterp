"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useDashboards } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, LayoutTemplate, MoreHorizontal, FileEdit, Trash, MonitorPlay, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function DashboardsListPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: dashboards, isLoading } = useDashboards();

    const filteredDashboards = dashboards?.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboards</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Build custom analytics and operation monitors using Live Data Sources.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild>
                        <Link href="/studio/dashboards/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New Dashboard
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search dashboards..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
            ) : !filteredDashboards?.length ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white border rounded-lg shadow-sm">
                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                        <LayoutTemplate className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No dashboards found</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm">
                        {searchQuery
                            ? "No dashboards match your search criteria."
                            : "Create custom views combining multiple data connectors and custom modules into unified dashboards."}
                    </p>
                    {!searchQuery && (
                        <Button asChild>
                            <Link href="/studio/dashboards/new">
                                <Plus className="mr-2 h-4 w-4" /> Create First Dashboard
                            </Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDashboards.map(dashboard => (
                        <Card key={dashboard.id} className="flex flex-col hover:shadow-md transition-shadow group relative overflow-hidden">
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <CardHeader className="pb-3 border-b flex-row items-start justify-between bg-slate-50/50">
                                <div className="space-y-1.5 w-[85%]">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base truncate" title={dashboard.name}>
                                            <Link href={`/studio/dashboards/${dashboard.id}`} className="hover:text-primary transition-colors cursor-pointer after:absolute after:inset-0">
                                                {dashboard.name}
                                            </Link>
                                        </CardTitle>
                                        {dashboard.isDefault && (
                                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Default</Badge>
                                        )}
                                    </div>
                                    {dashboard.description && (
                                        <CardDescription className="line-clamp-2 text-xs">
                                            {dashboard.description}
                                        </CardDescription>
                                    )}
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 relative z-20 shrink-0">
                                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/studio/dashboards/${dashboard.id}`} className="cursor-pointer">
                                                <MonitorPlay className="mr-2 h-4 w-4 text-slate-500" /> View Live
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/studio/dashboards/${dashboard.id}/edit`} className="cursor-pointer">
                                                <FileEdit className="mr-2 h-4 w-4 text-slate-500" /> Edit Layout
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                                            <Trash className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>

                            <CardContent className="pt-4 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col bg-slate-50 p-3 rounded-md border border-slate-100">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Widgets</span>
                                        <span className="text-lg font-bold text-slate-900 mt-1">{dashboard.widgets?.length || 0}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
