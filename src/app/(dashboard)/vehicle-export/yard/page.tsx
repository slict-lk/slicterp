"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion/primitives';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ClipboardCheck, RefreshCw, CheckCircle, Clock, Play,
    User, Package, Loader2, Wrench, Search, Camera, FileText, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Using tabs for mobile-friendly filter
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Vehicle {
    id: string;
    stockNumber: string;
    make: string;
    model: string;
    year: number;
    location: string | null;
}

interface YardJob {
    id: string;
    title: string;
    type: string;
    status: string;
    notes: string | null;
    assignedTo: string | null;
    completedAt: string | null;
    proofPhotos: string[];
    createdAt: string;
    vehicle: Vehicle;
    materials?: { id: string; partName: string; quantity: number; unitCost: number; totalCost: number }[];
}

const TYPE_ICONS: Record<string, any> = {
    INSPECTION: ClipboardCheck,
    REPAIR: Wrench,
    CLEANING: CheckCircle,
    DOCUMENT_CHECK: FileText,
    PHOTO_SHOOT: Camera,
};

const TYPE_STYLES: Record<string, string> = {
    INSPECTION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    REPAIR: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    CLEANING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    DOCUMENT_CHECK: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    PHOTO_SHOOT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

export default function YardJobsPage() {
    const [jobs, setJobs] = useState<YardJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedJob, setSelectedJob] = useState<YardJob | null>(null);
    const [processing, setProcessing] = useState(false);
    const [completionNotes, setCompletionNotes] = useState('');
    
    const fetchJobs = useCallback(async () => {
        try {
            setRefreshing(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);

            const res = await fetch(`/api/vehicle-export/yard-jobs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs || []);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const updateJobStatus = async (jobId: string, newStatus: string, notes?: string) => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/vehicle-export/yard-jobs/${jobId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    notes: notes || undefined,
                }),
            });
            if (res.ok) {
                toast.success('Job Updated', { description: `Status changed to ${newStatus}` });
                fetchJobs();
                setSelectedJob(null);
                setCompletionNotes('');
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to update job' });
        } finally {
            setProcessing(false);
        }
    };

    const addMaterial = async () => {
        const nameEl = document.getElementById('new-material-name') as HTMLInputElement;
        const qtyEl = document.getElementById('new-material-qty') as HTMLInputElement;
        const costEl = document.getElementById('new-material-cost') as HTMLInputElement;

        if (!selectedJob || !nameEl.value || !costEl.value) return;

        try {
            const res = await fetch(`/api/vehicle-export/yard-jobs/${selectedJob.id}/materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    partName: nameEl.value,
                    quantity: qtyEl.value,
                    unitCost: costEl.value
                })
            });
            if (res.ok) {
                const newMaterial = await res.json();
                setSelectedJob(prev => prev ? ({
                    ...prev,
                    materials: [...(prev.materials || []), newMaterial]
                }) : null);
                // Also trigger refresh in background
                fetchJobs();
                nameEl.value = '';
                costEl.value = '';
                toast.error('Material Added');
            }
        } catch (e) {
            toast.success('Error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black p-4 sm:p-6 pb-20 sm:pb-6">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <FadeIn className="flex items-center justify-between sticky top-0 bg-gray-50/90 dark:bg-black/90 backdrop-blur-sm z-10 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Yard Ops
                        </h1>
                        <p className="text-sm text-gray-500">Daily Task List</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={fetchJobs} disabled={refreshing}>
                        <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
                    </Button>
                </FadeIn>

                {/* Mobile-First Tabs */}
                <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
                        <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm">All</TabsTrigger>
                        <TabsTrigger value="TODO" className="rounded-lg text-xs sm:text-sm">ToDo</TabsTrigger>
                        <TabsTrigger value="IN_PROGRESS" className="rounded-lg text-xs sm:text-sm">Doing</TabsTrigger>
                        <TabsTrigger value="DONE" className="rounded-lg text-xs sm:text-sm">Done</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Clean List View */}
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No jobs found</p>
                    </div>
                ) : (
                    <StaggerContainer className="space-y-3">
                        {jobs.map((job) => {
                            const Icon = TYPE_ICONS[job.type] || ClipboardCheck;
                            return (
                                <StaggerItem key={job.id}>
                                    <div
                                        onClick={() => setSelectedJob(job)}
                                        className="group flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0", TYPE_STYLES[job.type])}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-gray-900 dark:text-white truncate">{job.title}</span>
                                                    {job.status === 'IN_PROGRESS' && <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500 gap-3">
                                                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-600 dark:text-gray-300">
                                                        {job.vehicle.stockNumber}
                                                    </span>
                                                    <span className="truncate">{job.vehicle.make} {job.vehicle.model}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors hidden sm:block" />
                                    </div>
                                </StaggerItem>
                            );
                        })}
                    </StaggerContainer>
                )}
            </div>

            {/* Job Detail Sheet/Dialog */}
            <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            {selectedJob?.title}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedJob?.vehicle.stockNumber} — {selectedJob?.vehicle.year} {selectedJob?.vehicle.make}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedJob && (
                        <div className="space-y-6 pt-2">
                            {/* Job Info */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                <Badge className={cn("shrink-0", TYPE_STYLES[selectedJob.type])}>{selectedJob.type}</Badge>
                                <Badge variant="outline" className="shrink-0">{selectedJob.status.replace('_', ' ')}</Badge>
                                {selectedJob.assignedTo && <Badge variant="secondary" className="shrink-0 flex gap-1"><User className="h-3 w-3" /> {selectedJob.assignedTo}</Badge>}
                            </div>

                            {/* Notes */}
                            {selectedJob.notes && (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 text-sm">
                                    <p className="font-semibold text-yellow-800 dark:text-yellow-500">Instructor Note</p>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">{selectedJob.notes}</p>
                                </div>
                            )}

                            {/* Interactive Actions */}
                            <div className="space-y-3">
                                {selectedJob.status === 'TODO' && (
                                    <Button
                                        onClick={() => updateJobStatus(selectedJob.id, 'IN_PROGRESS')}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg font-medium shadow-lg shadow-indigo-500/20"
                                        disabled={processing}
                                    >
                                        <Play className="mr-2 h-5 w-5" /> Start Job
                                    </Button>
                                )}

                                {selectedJob.status === 'IN_PROGRESS' && (
                                    <div className="space-y-4">

                                        {/* Materials */}
                                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl space-y-3">
                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                <Wrench className="h-4 w-4" /> Parts Used
                                            </h4>
                                            {selectedJob.materials?.map(m => (
                                                <div key={m.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                                    <span>{m.partName} x{m.quantity}</span>
                                                    <span className="font-mono">${Number(m.totalCost).toFixed(2)}</span>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <Input id="new-material-name" placeholder="Part name" className="bg-white h-8 text-sm" />
                                                <Input id="new-material-qty" placeholder="Qty" type="number" className="w-16 bg-white h-8 text-sm" />
                                                <Input id="new-material-cost" placeholder="$" type="number" className="w-20 bg-white h-8 text-sm" />
                                                <Button size="sm" onClick={addMaterial} variant="secondary" className="h-8">Add</Button>
                                            </div>
                                        </div>

                                        <Textarea
                                            value={completionNotes}
                                            onChange={(e) => setCompletionNotes(e.target.value)}
                                            placeholder="Final notes (issues found, etc)..."
                                            className="resize-none bg-gray-50 dark:bg-gray-900"
                                            rows={3}
                                        />
                                        <Button
                                            onClick={() => updateJobStatus(selectedJob.id, 'DONE', completionNotes)}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-medium shadow-lg shadow-green-500/20"
                                            disabled={processing}
                                        >
                                            <CheckCircle className="mr-2 h-5 w-5" /> Finish Job
                                        </Button>
                                    </div>
                                )}

                                {selectedJob.status === 'DONE' && (
                                    <div className="text-center p-6 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800">
                                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                                        <p className="text-green-700 dark:text-green-400 font-medium">Job Completed</p>
                                    </div>
                                )}

                                <Link href={`/vehicle-export/inventory/${selectedJob.vehicle.id}`} className="block">
                                    <Button variant="outline" className="w-full">
                                        View Full Vehicle Profile
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
