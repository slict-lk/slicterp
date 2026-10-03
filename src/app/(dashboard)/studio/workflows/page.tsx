"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useWorkflows, useToggleWorkflowMutation } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Workflow, Play, Settings2, Trash2, GitPullRequest, Loader2, StopCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';

export default function WorkflowsListPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: workflows, isLoading } = useWorkflows();
    const toggleWorkflow = useToggleWorkflowMutation();

    const filteredWorkflows = workflows?.filter(w =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Automation Workflows</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Design visual sequences for data routing, notifications, and scheduled jobs.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild>
                        <Link href="/studio/workflows/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Workflow
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search workflows..."
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
            ) : !filteredWorkflows?.length ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white border rounded-lg shadow-sm">
                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 border border-indigo-100">
                        <GitPullRequest className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No workflows found</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-md">
                        {searchQuery
                            ? "No automation sequences match your search."
                            : "Visually design condition-based sequences, multi-step actions, and data transformations without writing code."}
                    </p>
                    {!searchQuery && (
                        <Button asChild>
                            <Link href="/studio/workflows/new">
                                <Plus className="mr-2 h-4 w-4" /> Build First Workflow
                            </Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorkflows.map(workflow => (
                        <Card key={workflow.id} className="relative flex flex-col hover:shadow-md transition-all border-slate-200">
                            <CardHeader className="pb-4 items-start justify-between flex-row">
                                <div className="flex items-center gap-3 w-4/5">
                                    <div className={`h-10 w-10 flex shrink-0 items-center justify-center rounded-lg border ${workflow.isActive ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                        <Workflow className="h-5 w-5" />
                                    </div>
                                    <div className="truncate">
                                        <CardTitle className="text-md truncate font-semibold" title={workflow.name}>
                                            <Link href={`/studio/workflows/${workflow.id}`} className="hover:text-primary transition-colors cursor-pointer after:absolute after:inset-0">
                                                {workflow.name}
                                            </Link>
                                        </CardTitle>
                                        {workflow.description && (
                                            <CardDescription className="truncate text-xs mt-0.5">
                                                {workflow.description}
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
                                            <Link href={`/studio/workflows/${workflow.id}`} className="cursor-pointer">
                                                <Workflow className="mr-2 h-4 w-4 text-slate-500" /> Open Designer
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/studio/workflows/${workflow.id}/executions`} className="cursor-pointer">
                                                <Play className="mr-2 h-4 w-4 text-slate-500" /> View Executions
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Workflow
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="flex-1 pb-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Badge variant={workflow.isActive ? "default" : "secondary"} className={workflow.isActive ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' : ''}>
                                        {workflow.isActive ? 'Active' : 'Disabled'}
                                    </Badge>
                                    <span className="text-xs text-slate-500">
                                        {workflow.nodes?.length || 0} nodes defined
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t py-3 flex justify-between items-center text-xs text-slate-500 relative z-20">
                                <div className="flex items-center gap-1">
                                    {workflow.isActive ? <Play className="h-3 w-3 text-emerald-500" /> : <StopCircle className="h-3 w-3" />}
                                    <span>Runs: {(workflow as any)._count?.executions || 0}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-slate-600 cursor-pointer" htmlFor={`toggle-${workflow.id}`}>
                                        {workflow.isActive ? 'On' : 'Off'}
                                    </Label>
                                    <Switch
                                        id={`toggle-${workflow.id}`}
                                        checked={workflow.isActive}
                                        onCheckedChange={(checked) => toggleWorkflow.mutate({ id: workflow.id, isActive: checked })}
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
