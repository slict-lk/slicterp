'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Calendar,
    Plus,
    Check,
    X,
    Clock,
    User,
    Filter,
    Search,
    Download,
} from 'lucide-react';

interface LeaveRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    leaveType: 'SICK' | 'CASUAL' | 'ANNUAL' | 'EMERGENCY' | 'UNPAID';
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    appliedOn: string;
    department: string;
}

export default function LeaveRequestsPage() {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showNewRequest, setShowNewRequest] = useState(false);

    const [newRequest, setNewRequest] = useState({
        leaveType: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: '',
    });

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    const fetchLeaveRequests = async () => {
        try {
            const res = await fetch('/api/hr/leave-requests');
            if (res.ok) {
                const data = await res.json();
                const mappedRequests = (data.data || []).map((req: any) => ({
                    id: req.id,
                    employeeId: req.employeeId,
                    employeeName: req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : 'Unknown',
                    leaveType: req.leaveType,
                    startDate: req.startDate,
                    endDate: req.endDate,
                    days: req.days,
                    reason: req.reason,
                    status: req.status,
                    appliedOn: req.createdAt,
                    department: req.employee?.department?.name || 'Unassigned'
                }));
                setRequests(mappedRequests);
            }
        } catch (error) {
            console.error('Failed to fetch leave requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const res = await fetch(`/api/hr/leave-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED' }),
            });
            if (res.ok) {
                fetchLeaveRequests();
            }
        } catch (error) {
            console.error('Failed to approve leave:', error);
        }
    };

    const handleReject = async (id: string) => {
        try {
            const res = await fetch(`/api/hr/leave-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'REJECTED' }),
            });
            if (res.ok) {
                fetchLeaveRequests();
            }
        } catch (error) {
            console.error('Failed to reject leave:', error);
        }
    };

    const handleSubmitRequest = async () => {
        try {
            const res = await fetch('/api/hr/leave-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRequest),
            });
            if (res.ok) {
                setShowNewRequest(false);
                setNewRequest({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });
                fetchLeaveRequests();
            }
        } catch (error) {
            console.error('Failed to submit leave request:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-green-500">Approved</Badge>;
            case 'REJECTED':
                return <Badge variant="destructive">Rejected</Badge>;
            case 'PENDING':
                return <Badge variant="secondary">Pending</Badge>;
            default:
                return <Badge>Unknown</Badge>;
        }
    };

    const getLeaveTypeColor = (type: string) => {
        switch (type) {
            case 'SICK':
                return 'text-red-600 bg-red-100';
            case 'CASUAL':
                return 'text-blue-600 bg-blue-100';
            case 'ANNUAL':
                return 'text-green-600 bg-green-100';
            case 'EMERGENCY':
                return 'text-orange-600 bg-orange-100';
            case 'UNPAID':
                return 'text-gray-600 bg-gray-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const filteredRequests = requests.filter((request) => {
        const matchesSearch =
            request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.department.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        pending: requests.filter((r) => r.status === 'PENDING').length,
        approved: requests.filter((r) => r.status === 'APPROVED').length,
        rejected: requests.filter((r) => r.status === 'REJECTED').length,
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
                    <p className="text-gray-600">Manage employee leave applications</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Request
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Submit Leave Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="leaveType">Leave Type</Label>
                                    <Select
                                        value={newRequest.leaveType}
                                        onValueChange={(val) => setNewRequest({ ...newRequest, leaveType: val })}
                                    >
                                        <SelectTrigger id="leaveType">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CASUAL">Casual Leave</SelectItem>
                                            <SelectItem value="SICK">Sick Leave</SelectItem>
                                            <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                                            <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                                            <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Start Date</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={newRequest.startDate}
                                            onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={newRequest.endDate}
                                            onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason</Label>
                                    <Textarea
                                        id="reason"
                                        placeholder="Please specify the reason for leave..."
                                        value={newRequest.reason}
                                        onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                        rows={4}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setShowNewRequest(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSubmitRequest}>Submit Request</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Approved</p>
                                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                            </div>
                            <Check className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Rejected</p>
                                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                            </div>
                            <X className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by employee or department..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline">
                                <Filter className="h-4 w-4 mr-2" />
                                Filter
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Leave Requests */}
            <div className="grid gap-4">
                {filteredRequests.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No leave requests found</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredRequests.map((request) => (
                        <Card key={request.id}>
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <User className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-gray-900">{request.employeeName}</h3>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeColor(request.leaveType)}`}>
                                                    {request.leaveType}
                                                </span>
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{request.department}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                                </span>
                                                <span>({request.days} {request.days === 1 ? 'day' : 'days'})</span>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-2">{request.reason}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Applied on {new Date(request.appliedOn).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {request.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReject(request.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(request.id)}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Check className="h-4 w-4 mr-1" />
                                                Approve
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
