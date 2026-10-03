'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Wrench,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    Filter,
    MoreVertical,
    Search,
    Loader2,
    Hammer
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSettings } from '@/components/providers/SettingsProvider';

interface MaintenanceRequest {
    id: string;
    roomId?: string;
    room?: { roomNumber: string };
    location?: string;
    category: string;
    description: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    assignedTo?: string;
    reportedBy: string;
    createdAt: string;
}

export default function MaintenancePage() {
    const { data: session } = useSession();
    const tenantId = (session?.user as any)?.tenantId;

    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
    const [processing, setProcessing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        roomId: '', // Optional, for room-linked issues
        location: '', // Optional, for public areas
        category: 'OTHER',
        description: '',
        priority: 'NORMAL',
        reportedBy: 'Staff',
    });

    useEffect(() => {
        if (tenantId) {
            fetchRequests();
        }
    }, [tenantId]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/hotel/maintenance?tenantId=${tenantId}`);
            if (res.ok) {
                setRequests(await res.json());
            }
        } catch (error) {
            console.error('Error fetching maintenance requests:', error);
            toast.error('Failed to load maintenance requests');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setProcessing(true);
            const res = await fetch('/api/hotel/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    tenantId
                }),
            });

            if (res.ok) {
                toast.success('Maintenance request created');
                setIsDialogOpen(false);
                fetchRequests();
                setFormData({
                    roomId: '',
                    location: '',
                    category: 'OTHER',
                    description: '',
                    priority: 'NORMAL',
                    reportedBy: 'Staff',
                });
            } else {
                toast.error('Failed to create request');
            }
        } catch (error) {
            toast.error('Failed to create request');
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedRequest) return;
        try {
            setProcessing(true);
            const res = await fetch(`/api/hotel/maintenance/${selectedRequest.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                toast.success('Status updated');
                setIsDetailOpen(false);
                fetchRequests();
            }
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setProcessing(false);
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-red-500';
            case 'IN_PROGRESS': return 'bg-amber-500';
            case 'RESOLVED': return 'bg-emerald-500';
            case 'CLOSED': return 'bg-gray-500';
            default: return 'bg-blue-500';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                        Maintenance
                    </h1>
                    <p className="text-muted-foreground">Track repairs and work orders</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" /> New Request
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                    <Card key={status} className="border-l-4" style={{ borderLeftColor: status === 'OPEN' ? '#ef4444' : status === 'IN_PROGRESS' ? '#f59e0b' : status === 'RESOLVED' ? '#10b981' : '#6b7280' }}>
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium opacity-70">{status.replace('_', ' ')}</CardTitle>
                            <div className="text-2xl font-bold">
                                {requests.filter(r => r.status === status).length}
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Priority</TableHead>
                                <TableHead>Issue</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reported</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No maintenance requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                requests.map((req) => (
                                    <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedRequest(req); setIsDetailOpen(true); }}>
                                        <TableCell>
                                            <Badge variant="outline" className={getPriorityColor(req.priority)}>
                                                {req.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium truncate max-w-[200px]">{req.description}</div>
                                        </TableCell>
                                        <TableCell>
                                            {req.room ? (
                                                <Badge variant="secondary" className="font-mono">Room {req.room.roomNumber}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">{req.location || 'General'}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{req.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${getStatusColor(req.status)}`} />
                                                <span className="text-sm capitalize">{req.status.toLowerCase().replace('_', ' ')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(req.createdAt), 'MMM d')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* New Request Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Maintenance Request</DialogTitle>
                        <DialogDescription>Log a new issue for a room or facility</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PLUMBING">Plumbing</SelectItem>
                                        <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                                        <SelectItem value="HVAC">HVAC</SelectItem>
                                        <SelectItem value="FURNITURE">Furniture</SelectItem>
                                        <SelectItem value="APPLIANCE">Appliance</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="NORMAL">Normal</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Location</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Room Number (e.g. 101)"
                                    value={formData.roomId}
                                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                                />
                                <Input
                                    placeholder="Or Area (e.g. Lobby)"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Describe the issue..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={processing}>Submit Request</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                        <DialogDescription>ID: {selectedRequest?.id}</DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <Badge className={getPriorityColor(selectedRequest.priority)}>{selectedRequest.priority}</Badge>
                                <Select onValueChange={handleUpdateStatus} defaultValue={selectedRequest.status}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder={selectedRequest.status} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPEN">Open</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                                        <SelectItem value="CLOSED">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                                <p>{selectedRequest.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Location:</span>
                                    <span className="ml-2 font-medium">{selectedRequest.room ? `Room ${selectedRequest.room.roomNumber}` : selectedRequest.location}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Reported:</span>
                                    <span className="ml-2">{format(new Date(selectedRequest.createdAt), 'PP p')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
