'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Package, CheckCircle, XCircle, Clock,
    Loader2, Ship, Store, Users, Building2, Heart,
    Factory, Truck, Utensils, Hotel, BarChart3
} from 'lucide-react';

const AVAILABLE_MODULES: Record<string, { name: string; icon: any }> = {
    'vehicle-export': { name: 'Vehicle Export', icon: Ship },
    'spareparts': { name: 'Spare Parts Shop', icon: Store },
    'real-estate': { name: 'Real Estate', icon: Building2 },
    'healthcare': { name: 'Healthcare', icon: Heart },
    'manufacturing': { name: 'Manufacturing', icon: Factory },
    'purchasing': { name: 'Purchasing', icon: Truck },
    'restaurant': { name: 'Restaurant', icon: Utensils },
    'hotel': { name: 'Hotel', icon: Hotel },
    'crm': { name: 'CRM', icon: Users },
    'hr': { name: 'HR', icon: Users },
    'reports': { name: 'Reports', icon: BarChart3 },
};

interface ModuleRequest {
    id: string;
    moduleId: string;
    action: 'ADD' | 'REMOVE';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    reason: string | null;
    adminNotes: string | null;
    createdAt: string;
    tenant: { id: string; name: string; companyName: string };
    requestedBy: { name: string; email: string };
    processedBy: { name: string } | null;
}

export default function ModuleRequestsPage() {
        const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [requests, setRequests] = useState<ModuleRequest[]>([]);
    const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 });
    const [activeTab, setActiveTab] = useState('PENDING');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ModuleRequest | null>(null);
    const [adminNotes, setAdminNotes] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/module-requests?status=${activeTab === 'all' ? 'all' : activeTab}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setRequests(data.requests || []);
            setCounts(data.counts || { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 });
        } catch (error) {
            toast.error('Error', { description: 'Failed to load requests' });
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (action: 'approve' | 'reject') => {
        if (!selectedRequest) return;
        setProcessing(selectedRequest.id);
        try {
            const res = await fetch(`/api/admin/module-requests/${selectedRequest.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, adminNotes }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to process');
            }

            const result = await res.json();
            toast.success(action === 'approve' ? 'Approved' : 'Rejected', { description: result.message });
            setDialogOpen(false);
            setSelectedRequest(null);
            setAdminNotes('');
            fetchData();
        } catch (error: any) {
            toast.error('Error', { description: error.message });
        } finally {
            setProcessing(null);
        }
    };

    const openDialog = (request: ModuleRequest) => {
        setSelectedRequest(request);
        setAdminNotes('');
        setDialogOpen(true);
    };

    const getModuleInfo = (moduleId: string) => {
        return AVAILABLE_MODULES[moduleId] || { name: moduleId, icon: Package };
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

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Module Requests
                        {counts.PENDING > 0 && (
                            <Badge variant="destructive" className="ml-2">{counts.PENDING} Pending</Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground">Manage tenant module access requests</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="PENDING" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Pending ({counts.PENDING})
                    </TabsTrigger>
                    <TabsTrigger value="APPROVED" className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approved ({counts.APPROVED})
                    </TabsTrigger>
                    <TabsTrigger value="REJECTED" className="gap-2">
                        <XCircle className="h-4 w-4" />
                        Rejected ({counts.REJECTED})
                    </TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Requests</CardTitle>
                            <CardDescription>
                                {activeTab === 'PENDING' ? 'Requests awaiting your decision' : `${activeTab} requests`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : requests.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No requests found.</p>
                            ) : (
                                <div className="rounded-md border overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200">
                                            {requests.map(req => {
                                                const info = getModuleInfo(req.moduleId);
                                                const Icon = info.icon;
                                                return (
                                                    <tr key={req.id}>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div>
                                                                <p className="font-medium">{req.tenant.companyName}</p>
                                                                <p className="text-xs text-muted-foreground">{req.tenant.name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4 text-gray-500" />
                                                                {info.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <Badge variant={req.action === 'ADD' ? 'default' : 'destructive'}>
                                                                {req.action}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div>
                                                                <p className="text-sm">{req.requestedBy.name}</p>
                                                                <p className="text-xs text-muted-foreground">{req.requestedBy.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                                                            {req.reason || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(req.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                                            {req.status === 'PENDING' && (
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-green-600 border-green-600 hover:bg-green-50"
                                                                        onClick={() => openDialog(req)}
                                                                    >
                                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                                        Review
                                                                    </Button>
                                                                </div>
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
                </TabsContent>
            </Tabs>

            {/* Review Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review Module Request</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Tenant</p>
                                    <p className="font-medium">{selectedRequest.tenant.companyName}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Module</p>
                                    <p className="font-medium">{getModuleInfo(selectedRequest.moduleId).name}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Action</p>
                                    <Badge variant={selectedRequest.action === 'ADD' ? 'default' : 'destructive'}>
                                        {selectedRequest.action}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Requested By</p>
                                    <p className="font-medium">{selectedRequest.requestedBy.name}</p>
                                </div>
                            </div>
                            {selectedRequest.reason && (
                                <div>
                                    <p className="text-muted-foreground text-sm">Reason</p>
                                    <p className="text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded">{selectedRequest.reason}</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Admin Notes (Optional)</Label>
                                <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes for the tenant..."
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button
                            variant="destructive"
                            onClick={() => handleProcess('reject')}
                            disabled={processing !== null}
                        >
                            {processing === selectedRequest?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                        </Button>
                        <Button
                            onClick={() => handleProcess('approve')}
                            disabled={processing !== null}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing === selectedRequest?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
