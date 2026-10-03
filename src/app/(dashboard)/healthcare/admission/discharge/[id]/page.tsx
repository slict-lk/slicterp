"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Bed, Calendar, Calculator, CheckCircle2, FileText, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { generateLabReportPDF } from '@/lib/pdf-generator';
// We will create a discharge summary PDF later or reuse parts

interface AdmissionCharge {
    id: string;
    chargeType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    chargeDate: string;
}

interface Admission {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    status: string;
    bed: {
        roomNumber: string;
        bedNumber: string;
        dailyRate: number;
    };
    patient: {
        firstName: string;
        lastName: string;
        patientNumber: string;
        dateOfBirth: string;
        gender: string;
    };
    depositAmount: number;
    totalCharges: number;
    charges: AdmissionCharge[];
}

export default function DischargePage() {
    const router = useRouter();
    const params = useParams();
    const admissionId = params.id as string;

    const [admission, setAdmission] = useState<Admission | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [dischargeNotes, setDischargeNotes] = useState('');

    // Calculated locals
    const [daysStayed, setDaysStayed] = useState(0);
    const [estimatedRoomCharge, setEstimatedRoomCharge] = useState(0);

    const fetchAdmission = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/healthcare/admissions/${admissionId}`);
            if (res.ok) {
                const data = await res.json();
                setAdmission(data);

                // Calculate estimated room charges
                if (data.status === 'ADMITTED') {
                    const admitted = new Date(data.admissionDate);
                    const now = new Date();
                    const days = Math.max(1, Math.ceil((now.getTime() - admitted.getTime()) / (1000 * 60 * 60 * 24)));
                    setDaysStayed(days);

                    // Check if already charged
                    const hasRoomCharge = data.charges.some((c: any) => c.chargeType === 'ROOM');
                    if (!hasRoomCharge) {
                        setEstimatedRoomCharge(days * data.bed.dailyRate);
                    }
                }
            } else {
                toast.error('Admission not found');
                router.push('/healthcare/admission');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load admission');
        } finally {
            setLoading(false);
        }
    }, [admissionId, router]);

    useEffect(() => {
        fetchAdmission();
    }, [fetchAdmission]);

    const handleConfirmDischarge = async () => {
        try {
            setProcessing(true);
            const res = await fetch(`/api/healthcare/admissions/${admissionId}/discharge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dischargeNotes }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to discharge');
            }

            const data = await res.json();
            toast.success('Patient discharged successfully');

            // Redirect to list or show invoice
            router.push('/healthcare/admission');

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to discharge');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!admission) return null;

    // Calculate totals
    const currentTotal = admission.charges.reduce((sum, c) => sum + c.totalAmount, 0);
    const finalTotal = currentTotal + estimatedRoomCharge;
    const balanceDue = finalTotal - admission.depositAmount;

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Discharge Summary</h1>
                    <p className="text-gray-500">Review final bill and release bed</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Patient & Stay Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg flex justify-between">
                                <span>{admission.patient.firstName} {admission.patient.lastName}</span>
                                <Badge variant="outline">{admission.patient.patientNumber}</Badge>
                            </CardTitle>
                            <CardDescription>
                                Admission #{admission.admissionNumber}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Room / Bed</p>
                                <div className="flex items-center gap-2 font-medium">
                                    <Bed className="h-4 w-4 text-blue-500" />
                                    {admission.bed.roomNumber} - {admission.bed.bedNumber}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Admission Date</p>
                                <div className="flex items-center gap-2 font-medium">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    {new Date(admission.admissionDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Duration</p>
                                <p className="font-medium">{daysStayed} Days</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <Badge>{admission.status}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Charges Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 text-sm font-medium text-gray-500 pb-2 border-b">
                                    <div className="col-span-6">Description</div>
                                    <div className="col-span-2 text-right">Qty</div>
                                    <div className="col-span-2 text-right">Rate</div>
                                    <div className="col-span-2 text-right">Total</div>
                                </div>

                                {/* Existing Charges */}
                                {admission.charges.map(charge => (
                                    <div key={charge.id} className="grid grid-cols-12 text-sm py-2 border-b border-dashed last:border-0">
                                        <div className="col-span-6 font-medium">{charge.description}</div>
                                        <div className="col-span-2 text-right text-gray-500">{charge.quantity}</div>
                                        <div className="col-span-2 text-right text-gray-500">{formatCurrency(charge.unitPrice)}</div>
                                        <div className="col-span-2 text-right font-medium">{formatCurrency(charge.totalAmount)}</div>
                                    </div>
                                ))}

                                {/* Estimated Room Charge */}
                                {estimatedRoomCharge > 0 && (
                                    <div className="grid grid-cols-12 text-sm py-2 bg-blue-50 rounded px-2">
                                        <div className="col-span-6 font-medium text-blue-800">
                                            Room Charges (Pending) - {daysStayed} days
                                        </div>
                                        <div className="col-span-2 text-right text-blue-600">{daysStayed}</div>
                                        <div className="col-span-2 text-right text-blue-600">{formatCurrency(admission.bed.dailyRate)}</div>
                                        <div className="col-span-2 text-right font-bold text-blue-800">{formatCurrency(estimatedRoomCharge)}</div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Discharge Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Enter clinical notes, discharge instructions, or remarks..."
                                value={dischargeNotes}
                                onChange={e => setDischargeNotes(e.target.value)}
                                rows={4}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Bill Summary */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 text-white border-0 shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5" />
                                Payment Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-slate-300">
                                <span>Total Charges</span>
                                <span>{formatCurrency(finalTotal)}</span>
                            </div>
                            <div className="flex justify-between text-green-400">
                                <span>Less: Deposit</span>
                                <span>- {formatCurrency(admission.depositAmount)}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-700 flex justify-between items-baseline">
                                <span className="text-lg font-medium">Balance Due</span>
                                <span className="text-3xl font-bold">{formatCurrency(balanceDue)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-3">
                            <Button
                                className="w-full bg-green-500 hover:bg-green-600 text-white"
                                size="lg"
                                onClick={handleConfirmDischarge}
                                disabled={processing}
                            >
                                {processing ? (
                                    'Processing...'
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-5 w-5" />
                                        Confirm Discharge
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-center text-slate-400">
                                This will release the bed, generate a final bill invoice, and close the admission.
                            </p>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="outline" className="w-full justify-start">
                                <FileText className="mr-2 h-4 w-4" /> View Medical History
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <Banknote className="mr-2 h-4 w-4" /> Add Manual Charge
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
