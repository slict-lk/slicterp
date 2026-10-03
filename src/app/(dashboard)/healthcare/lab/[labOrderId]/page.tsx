"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FlaskConical, FileText, Save, AlertCircle, CheckCircle2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { generateLabReportPDF } from '@/lib/pdf-generator';
import { useModulePermissions } from '@/hooks/useModulePermissions';

interface LabOrder {
    id: string;
    orderNumber: string;
    orderDate: string;
    status: string;
    testName: string;
    result: string | null;
    resultDate: string | null;
    resultEnteredBy: string | null;
    notes: string | null;
    isPaid: boolean;
    visit: {
        id: string;
        patient: {
            id: string;
            firstName: string;
            lastName: string;
            patientNumber: string;
            dateOfBirth: string;
            gender: string;
        };
    };
    test: {
        id: string;
        name: string;
        code: string;
        category: string | null;
        price: number;
        resultTemplate: string | null;
    };
}

export default function LabOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const labOrderId = params.labOrderId as string;
    const { user } = useModulePermissions();

    const [order, setOrder] = useState<LabOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState('');
    const [notes, setNotes] = useState('');

    const fetchOrder = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/healthcare/lab-orders/${labOrderId}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
                setResult(data.result || '');
                setNotes(data.notes || '');
            } else {
                toast.error('Lab order not found');
                router.push('/healthcare/lab');
            }
        } catch (error) {
            console.error('Error fetching lab order:', error);
            toast.error('Failed to load lab order');
        } finally {
            setLoading(false);
        }
    }, [labOrderId, router]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const handleUpdateStatus = async (status: string) => {
        try {
            setSaving(true);
            const res = await fetch(`/api/healthcare/lab-orders/${labOrderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) throw new Error('Failed to update status');

            toast.success(`Status updated to ${status}`);
            fetchOrder();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveResult = async () => {
        if (!result.trim()) {
            toast.error('Please enter the test result');
            return;
        }

        try {
            setSaving(true);
            const res = await fetch(`/api/healthcare/lab-orders/${labOrderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    result,
                    notes,
                    status: 'COMPLETED',
                    resultDate: new Date().toISOString(),
                    resultEnteredBy: user?.name,
                }),
            });

            if (!res.ok) throw new Error('Failed to save result');

            toast.success('Result saved successfully');
            fetchOrder();
        } catch (error) {
            toast.error('Failed to save result');
        } finally {
            setSaving(false);
        }
    };

    const calculateAge = (dob: string) => {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const handlePrint = () => {
        if (!order || !order.result) return;

        generateLabReportPDF({
            patient: {
                name: `${order.visit.patient.firstName} ${order.visit.patient.lastName}`,
                patientNumber: order.visit.patient.patientNumber,
                age: calculateAge(order.visit.patient.dateOfBirth),
                gender: order.visit.patient.gender
            },
            testName: order.test.name,
            resultDate: order.resultDate ? new Date(order.resultDate) : new Date(),
            results: order.result,
            enteredBy: order.resultEnteredBy || user?.name || "Lab Staff"
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
            case 'SAMPLE_COLLECTED':
                return <Badge className="bg-blue-100 text-blue-800">Sample Collected</Badge>;
            case 'IN_PROGRESS':
                return <Badge className="bg-purple-100 text-purple-800">In Progress</Badge>;
            case 'COMPLETED':
                return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 p-6 text-white shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0tNCAwSDMwVjBoMnYzNHptLTQgMEgyOFYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDIwVjBoMnYzNHptLTQgMEgxNlYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDhWMGgydjM0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/healthcare/lab')} className="text-white hover:bg-white/20">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">{order.test.name}</h1>
                                {getStatusBadge(order.status)}
                            </div>
                            <p className="mt-1 text-teal-100">
                                {order.orderNumber} • {order.test.code}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {order.status === 'COMPLETED' && (
                            <Button onClick={handlePrint} className="bg-white/10 hover:bg-white/20 text-white border-0">
                                <Printer className="mr-2 h-4 w-4" /> Print Report
                            </Button>
                        )}
                        {!order.isPaid && (
                            <Badge className="bg-red-500/30 text-white border-red-300">Unpaid</Badge>
                        )}
                        {order.isPaid && (
                            <Badge className="bg-green-500/30 text-white border-green-300">Paid</Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Patient Info Card */}
            <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-teal-500" />
                        Patient Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Patient Name</p>
                            <p className="font-medium">{order.visit.patient.firstName} {order.visit.patient.lastName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Patient Number</p>
                            <p className="font-mono font-medium">{order.visit.patient.patientNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Gender/Age</p>
                            <p className="font-medium">{order.visit.patient.gender}/{calculateAge(order.visit.patient.dateOfBirth)}yrs</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Order Date</p>
                            <p className="font-medium">{new Date(order.orderDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Actions */}
            {order.status !== 'COMPLETED' && (
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle>Update Status</CardTitle>
                        <CardDescription>Update the lab order status as you process it</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {order.status === 'PENDING' && (
                                <Button onClick={() => handleUpdateStatus('SAMPLE_COLLECTED')} disabled={saving}>
                                    Mark Sample Collected
                                </Button>
                            )}
                            {order.status === 'SAMPLE_COLLECTED' && (
                                <Button onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={saving}>
                                    Start Processing
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Result Entry */}
            <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-emerald-50">
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5 text-teal-500" />
                        Test Result
                    </CardTitle>
                    <CardDescription>
                        {order.status === 'COMPLETED' ? 'View the test result' : 'Enter the test result'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {order.test.resultTemplate && (
                        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="flex items-center gap-2 text-blue-800 mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-medium">Result Template</span>
                            </div>
                            <pre className="text-sm text-blue-700 whitespace-pre-wrap">{order.test.resultTemplate}</pre>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Result *</Label>
                            <Textarea
                                placeholder="Enter test result..."
                                value={result}
                                onChange={(e) => setResult(e.target.value)}
                                rows={6}
                                disabled={order.status === 'COMPLETED'}
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lab Notes</Label>
                            <Textarea
                                placeholder="Additional notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                disabled={order.status === 'COMPLETED'}
                            />
                        </div>

                        {order.status === 'COMPLETED' && order.resultDate && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Result recorded on {new Date(order.resultDate).toLocaleString()}</span>
                            </div>
                        )}

                        {order.status !== 'COMPLETED' && (
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSaveResult}
                                    disabled={saving || !result.trim()}
                                    className="bg-gradient-to-r from-teal-600 to-emerald-600"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? 'Saving...' : 'Save Result & Complete'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
