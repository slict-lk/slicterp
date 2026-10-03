'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Package, Plus, X, Clock, CheckCircle, XCircle,
    Loader2, Ship, Store, Users, Building2, Heart,
    Factory, Truck, Utensils, Hotel, FileText, BarChart3,
    Car, Wrench, FileEdit, Mail, CalendarDays, ClipboardList,
    BookOpen, Headphones, MessageCircle, UserCircle, BookText,
    MessageSquare, Brain, Palette, Link as LinkIcon, Settings,
    LayoutDashboard, Activity, CheckCircle as CheckCircle2,
    Calendar
} from 'lucide-react';

// Available modules configuration based on sidebar categories
const AVAILABLE_MODULES = [
    // ── Business Verticals ──
    { id: 'vehicle-export', name: 'Vehicle Export', icon: Ship, description: 'Japanese car export business' },
    { id: 'automotive', name: 'Automotive', icon: Car, description: 'Auto Workshop & Dealership' },
    { id: 'spareparts', name: 'Spare Parts Shop', icon: Store, description: 'Auto parts retail & POS' },
    { id: 'properties', name: 'Real Estate', icon: Building2, description: 'Property management' },
    { id: 'healthcare', name: 'Healthcare', icon: Heart, description: 'Hospital & clinic management' },
    { id: 'hotel', name: 'Hotel & Hospitality', icon: Hotel, description: 'Room booking & front desk' },
    { id: 'restaurant', name: 'Restaurant', icon: Utensils, description: 'POS & kitchen display' },

    // ── Core ERP Operations ──
    { id: 'sales', name: 'Sales & CRM', icon: Users, description: 'Customer relationship & Sales Pipelines' },
    { id: 'accounting', name: 'Accounting', icon: FileText, description: 'Financial ledgers, payments, and invoices' },
    { id: 'inventory', name: 'Inventory', icon: Package, description: 'Stock, warehouses, and reorder alerts' },
    { id: 'manufacturing', name: 'Manufacturing', icon: Factory, description: 'Production & BOM' },
    { id: 'purchasing', name: 'Purchasing', icon: Truck, description: 'Vendor & purchase orders' },
    { id: 'quality', name: 'Quality Control', icon: CheckCircle2, description: 'Quality checks & inspections' },
    { id: 'hr', name: 'HR & People', icon: Users, description: 'Human resources and timesheets' },
    { id: 'projects', name: 'Projects', icon: Calendar, description: 'Project tracking and tasks' },

    // ── Marketing & Engagement ──
    { id: 'marketing', name: 'Marketing', icon: Mail, description: 'Campaigns, websites, and events' },
    { id: 'blog', name: 'Blog', icon: FileEdit, description: 'Blog management' },
    { id: 'calendar', name: 'Calendar & Events', icon: CalendarDays, description: 'Appointments and events' },
    { id: 'surveys', name: 'Surveys', icon: ClipboardList, description: 'Feedback and forms' },
    { id: 'courses', name: 'eLearning', icon: BookOpen, description: 'Course management' },

    // ── Support & Communication ──
    { id: 'helpdesk', name: 'Helpdesk', icon: Headphones, description: 'Support ticketing' },
    { id: 'livechat', name: 'Live Chat', icon: MessageCircle, description: 'Real-time messaging' },
    { id: 'contacts', name: 'Contacts', icon: UserCircle, description: 'Centralized directory' },
    { id: 'knowledge', name: 'Knowledge Base', icon: BookText, description: 'Documentation center' },
    { id: 'forum', name: 'Community Forum', icon: MessageSquare, description: 'Community discussions' },

    // ── Platform & Intelligence ──
    { id: 'ai', name: 'AI & Automation', icon: Brain, description: 'Agents and automated tasks' },
    { id: 'studio', name: 'No-Code Studio', icon: Palette, description: 'Custom apps and dashboards' },
    { id: 'integrations', name: 'Integrations', icon: LinkIcon, description: 'Messages & Couriers' },
    { id: 'audit', name: 'Reports & Auditing', icon: BarChart3, description: 'Global advanced analytics' },
];

interface ModuleRequest {
    id: string;
    moduleId: string;
    action: 'ADD' | 'REMOVE';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    reason: string | null;
    adminNotes: string | null;
    createdAt: string;
    requestedBy: { name: string };
    processedBy: { name: string } | null;
}

export default function ModulesPage() {
        const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [requests, setRequests] = useState<ModuleRequest[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState('');
    const [requestAction, setRequestAction] = useState<'ADD' | 'REMOVE'>('ADD');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/module-requests');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setEnabledModules(data.enabledModules || []);
            setRequests(data.requests || []);
        } catch (error) {
            toast.error('Error', { description: 'Failed to load module data' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRequest = async () => {
        if (!selectedModule) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/module-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleId: selectedModule, action: requestAction, reason }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit request');
            }

            toast.success('Success', { description: 'Module request submitted successfully' });
            setDialogOpen(false);
            setSelectedModule('');
            setReason('');
            fetchData();
        } catch (error: any) {
            toast.error('Error', { description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelRequest = async (id: string) => {
        try {
            const res = await fetch(`/api/module-requests/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to cancel');
            toast.success('Cancelled', { description: 'Request cancelled successfully' });
            fetchData();
        } catch (error) {
            toast.error('Error', { description: 'Failed to cancel request' });
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-gray-100 text-gray-800',
        };
        return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
    };

    const getModuleInfo = (moduleId: string) => {
        return AVAILABLE_MODULES.find(m => m.id === moduleId) || { name: moduleId, icon: Package };
    };

    // Modules available to request (not enabled and no pending request)
    const availableToRequest = AVAILABLE_MODULES.filter(m =>
        !enabledModules.includes(m.id) &&
        !requests.some(r => r.moduleId === m.id && r.status === 'PENDING')
    );

    // Modules available to remove (enabled and no pending removal request)
    const availableToRemove = AVAILABLE_MODULES.filter(m =>
        enabledModules.includes(m.id) &&
        !requests.some(r => r.moduleId === m.id && r.action === 'REMOVE' && r.status === 'PENDING')
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Module Access</h1>
                    <p className="text-muted-foreground">Manage your organization's module access</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Request Module
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 p-0 overflow-hidden shadow-2xl">
                        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                            <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900">Module Access</DialogTitle>
                            <CardDescription className="text-slate-500 mt-1.5">Manage which ERP modules are enabled for your workspace.</CardDescription>
                        </DialogHeader>
                        <div className="space-y-5 px-6 pb-2">
                            <div className="space-y-3">
                                <Label className="text-slate-700 font-medium">Request Type</Label>
                                <Select value={requestAction} onValueChange={(v: 'ADD' | 'REMOVE') => {
                                    setRequestAction(v);
                                    setSelectedModule(''); // reset module when action changes
                                }}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
                                        <SelectValue placeholder="Select type of request" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADD" className="cursor-pointer py-2">Enable New Module</SelectItem>
                                        <SelectItem value="REMOVE" className="cursor-pointer py-2">Disable Active Module</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-slate-700 font-medium">Select Module</Label>
                                <Select value={selectedModule} onValueChange={setSelectedModule}>
                                    <SelectTrigger className="h-14 bg-slate-50 border-slate-200">
                                        <SelectValue placeholder="Choose a module from the list" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                        {(requestAction === 'ADD' ? availableToRequest : availableToRemove).map(m => (
                                            <SelectItem key={m.id} value={m.id} className="cursor-pointer py-3 pr-8 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                                                        <m.icon className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-semibold text-slate-900">{m.name}</span>
                                                        <span className="text-xs text-slate-500">{m.description}</span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-slate-700 font-medium">Reason (Optional)</Label>
                                <Textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Why do you need this module?"
                                    className="min-h-[100px] resize-none bg-slate-50 border-slate-200"
                                />
                            </div>
                        </div>
                        <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-3 w-full">
                            <Button variant="outline" className="w-[120px] h-10 font-medium border-slate-200 hover:bg-slate-100 text-slate-700" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
                            <Button onClick={handleSubmitRequest} className="flex-1 h-10 font-medium bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 transition-colors shadow-sm" disabled={!selectedModule || submitting}>
                                {submitting ? (
                                   <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing Request...</>
                                ) : "Submit Request"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Current Modules */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Enabled Modules
                    </CardTitle>
                    <CardDescription>Modules currently active for your organization</CardDescription>
                </CardHeader>
                <CardContent>
                    {enabledModules.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No modules enabled yet. Request access to get started.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {enabledModules.map(moduleId => {
                                const info = getModuleInfo(moduleId);
                                const Icon = info.icon || Package;
                                return (
                                    <div key={moduleId} className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                                            <Icon className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{info.name}</p>
                                            <p className="text-xs text-muted-foreground">Active</p>
                                        </div>
                                        <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Request History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Request History
                    </CardTitle>
                    <CardDescription>Track your module access requests</CardDescription>
                </CardHeader>
                <CardContent>
                    {requests.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No requests yet.</p>
                    ) : (
                        <div className="rounded-md border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200">
                                    {requests.map(req => {
                                        const info = getModuleInfo(req.moduleId);
                                        return (
                                            <tr key={req.id}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <info.icon className="h-4 w-4 text-gray-500" />
                                                        {info.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <Badge variant={req.action === 'ADD' ? 'default' : 'destructive'}>
                                                        {req.action}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                                                    {req.adminNotes || '-'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    {req.status === 'PENDING' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCancelRequest(req.id)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
