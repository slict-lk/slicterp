"use client";

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useWorkflow } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Play, Search, Clock, CheckCircle2, XCircle, AlertCircle, FileJson } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WorkflowExecutionsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const workflowId = resolvedParams.id;
    const { data: workflow, isLoading } = useWorkflow(workflowId);

    const [executions, setExecutions] = useState<any[]>([]);
    const [loadingExecutions, setLoadingExecutions] = useState(true);
    const [search, setSearch] = useState('');

    const fetchExecutions = useCallback(async () => {
        try {
            setLoadingExecutions(true);
            const res = await fetch(`/api/studio/workflows/${workflowId}/executions`);
            if (!res.ok) throw new Error('Failed to fetch executions');
            const data = await res.json();
            setExecutions(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoadingExecutions(false);
        }
    }, [workflowId]);

    useEffect(() => {
        fetchExecutions();
    }, [fetchExecutions]);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    if (!workflow) {
        return <div className="p-8 text-center text-slate-500">Workflow not found</div>;
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            default: return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Success</Badge>;
            case 'failed': return <Badge variant="destructive">Failed</Badge>;
            case 'running': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Running</Badge>;
            default: return <Badge variant="secondary">Pending</Badge>;
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
                        <Link href="/studio/workflows">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{workflow.name}</h1>
                            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">Execution History</Badge>
                        </div>
                        <p className="text-sm text-slate-500">
                            View past runs, inspect context payloads, and debug automations.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild variant="outline">
                        <Link href={`/studio/workflows/${workflowId}`}>
                            Edit Workflow
                        </Link>
                    </Button>
                    <Button onClick={fetchExecutions}>
                        Refresh Logs
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 flex flex-col">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Total Runs</span>
                        <span className="text-2xl font-bold text-slate-900 mt-1">{executions.length}</span>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                    <CardContent className="p-4 flex flex-col">
                        <span className="text-xs font-semibold text-emerald-700 uppercase">Success Rate</span>
                        <span className="text-2xl font-bold text-emerald-900 mt-1">
                            {executions.length ? Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100) : 0}%
                        </span>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-red-200 bg-red-50/30">
                    <CardContent className="p-4 flex flex-col">
                        <span className="text-xs font-semibold text-red-700 uppercase">Failed Runs</span>
                        <span className="text-2xl font-bold text-red-900 mt-1">
                            {executions.filter(e => e.status === 'failed').length}
                        </span>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between gap-4 mt-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search execution logs..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white flex-1 relative flex flex-col overflow-hidden max-h-[600px] overflow-y-auto">
                <Table>
                    <TableHeader className="bg-slate-50 border-b sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[180px]">Run ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Started At</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Context / Trigger</TableHead>
                            <TableHead className="text-right">Logs</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingExecutions ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-300" />
                                </TableCell>
                            </TableRow>
                        ) : executions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                                    <AlertCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                                    No executions recorded for this workflow yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            executions.filter(e => e.id.toLowerCase().includes(search.toLowerCase())).map((exec) => (
                                <TableRow key={exec.id} className="hover:bg-slate-50">
                                    <TableCell className="font-mono text-xs text-slate-600 truncate max-w-[120px]" title={exec.id}>
                                        {exec.id.split('-')[0]}...
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(exec.status)}
                                            {getStatusBadge(exec.status)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {format(new Date(exec.startedAt), 'MMM d, yyyy HH:mm:ss')}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500 font-mono">
                                        {exec.completedAt ? `${new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()}ms` : '--'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded max-w-[200px] truncate">
                                            <FileJson className="h-3 w-3 shrink-0" />
                                            {JSON.stringify(exec.context ?? {}).substring(0, 30)}...
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="text-indigo-600">
                                            View Audit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
