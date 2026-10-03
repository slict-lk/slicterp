"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Pill, FlaskConical, BedDouble, CheckCircle, AlertCircle, Trash2, Plus, FileSignature } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    patientNumber: string;
    phone: string | null;
    gender: string;
    dateOfBirth: string;
    bloodGroup: string | null;
    allergies: string | null;
    chronicConditions: string | null;
}

interface Prescription {
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    quantity: number;
    isSignedByDoctor: boolean;
    signedAt: string | null;
    isDispensed: boolean;
}

interface LabTest {
    id: string;
    code: string;
    name: string;
    category: string;
    price: number;
}

interface LabOrder {
    id: string;
    orderNumber: string;
    status: string;
    labTest: LabTest;
}

interface Visit {
    id: string;
    visitNumber: number;
    visitDate: string;
    type: string;
    status: string;
    chiefComplaint: string | null;
    symptoms: string | null;
    diagnosis: string | null;
    notes: string | null;
    bloodPressure: string | null;
    temperature: number | null;
    pulse: number | null;
    weight: number | null;
    height: number | null;
    isCompleted: boolean;
    doctorSignature: string | null;
    patient: Patient;
    prescriptions: Prescription[];
    labOrders: LabOrder[];
}

export default function ConsultationDetailPage() {
    const router = useRouter();
    const params = useParams();
    const visitId = params.visitId as string;

    const [visit, setVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [labTests, setLabTests] = useState<LabTest[]>([]);

    // Form states
    const [vitals, setVitals] = useState({
        bloodPressure: '',
        temperature: '',
        pulse: '',
        weight: '',
        height: '',
    });
    const [clinicalData, setClinicalData] = useState({
        chiefComplaint: '',
        symptoms: '',
        diagnosis: '',
        notes: '',
    });

    // Prescription form
    const [newPrescription, setNewPrescription] = useState({
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: 1,
    });
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);

    // Lab order form
    const [selectedLabTest, setSelectedLabTest] = useState('');
    const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
    const [isLabDialogOpen, setIsLabDialogOpen] = useState(false);

    const fetchVisit = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/healthcare/visits/${visitId}`);
            if (res.ok) {
                const data = await res.json();
                setVisit(data);

                // Set form values
                setVitals({
                    bloodPressure: data.bloodPressure || '',
                    temperature: data.temperature?.toString() || '',
                    pulse: data.pulse?.toString() || '',
                    weight: data.weight?.toString() || '',
                    height: data.height?.toString() || '',
                });
                setClinicalData({
                    chiefComplaint: data.chiefComplaint || '',
                    symptoms: data.symptoms || '',
                    diagnosis: data.diagnosis || '',
                    notes: data.notes || '',
                });
                setPrescriptions(data.prescriptions || []);
                setLabOrders(data.labOrders || []);
            } else {
                toast.error('Visit not found');
                router.push('/healthcare/consultation');
            }
        } catch (error) {
            console.error('Error fetching visit:', error);
            toast.error('Failed to load visit');
        } finally {
            setLoading(false);
        }
    }, [visitId, router]);

    const fetchLabTests = useCallback(async () => {
        try {
            const res = await fetch('/api/healthcare/lab-tests');
            if (res.ok) {
                const data = await res.json();
                setLabTests(data.labTests || data || []);
            }
        } catch (error) {
            console.error('Error fetching lab tests:', error);
        }
    }, []);

    useEffect(() => {
        fetchVisit();
        fetchLabTests();
    }, [fetchVisit, fetchLabTests]);

    const handleSaveVitals = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/healthcare/visits/${visitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bloodPressure: vitals.bloodPressure || null,
                    temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
                    pulse: vitals.pulse ? parseInt(vitals.pulse) : null,
                    weight: vitals.weight ? parseFloat(vitals.weight) : null,
                    height: vitals.height ? parseFloat(vitals.height) : null,
                }),
            });

            if (!res.ok) throw new Error('Failed to save');
            toast.success('Vitals saved');
        } catch (error) {
            toast.error('Failed to save vitals');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveClinicalData = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/healthcare/visits/${visitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clinicalData),
            });

            if (!res.ok) throw new Error('Failed to save');
            toast.success('Clinical data saved');
        } catch (error) {
            toast.error('Failed to save clinical data');
        } finally {
            setSaving(false);
        }
    };

    const handleAddPrescription = async () => {
        try {
            const res = await fetch(`/api/healthcare/visits/${visitId}/prescriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPrescription),
            });

            if (!res.ok) throw new Error('Failed to add');
            const prescription = await res.json();
            setPrescriptions([...prescriptions, prescription]);
            setNewPrescription({
                medication: '',
                dosage: '',
                frequency: '',
                duration: '',
                instructions: '',
                quantity: 1,
            });
            setIsPrescriptionDialogOpen(false);
            toast.success('Prescription added');
        } catch (error) {
            toast.error('Failed to add prescription');
        }
    };

    const handleAddLabOrder = async () => {
        if (!selectedLabTest) {
            toast.error('Please select a test');
            return;
        }

        try {
            const res = await fetch(`/api/healthcare/visits/${visitId}/lab-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labTestId: selectedLabTest }),
            });

            if (!res.ok) throw new Error('Failed to add');
            const labOrder = await res.json();
            setLabOrders([...labOrders, labOrder]);
            setSelectedLabTest('');
            setIsLabDialogOpen(false);
            toast.success('Lab order added');
        } catch (error) {
            toast.error('Failed to add lab order');
        }
    };

    const handleSignPrescriptions = async () => {
        try {
            const res = await fetch(`/api/healthcare/visits/${visitId}/sign`, {
                method: 'POST',
            });

            if (!res.ok) throw new Error('Failed to sign');
            toast.success('Prescriptions signed');
            fetchVisit();
        } catch (error) {
            toast.error('Failed to sign prescriptions');
        }
    };

    const handleCompleteConsultation = async () => {
        try {
            setSaving(true);

            // Sign prescriptions first
            if (prescriptions.length > 0 && prescriptions.some(p => !p.isSignedByDoctor)) {
                await fetch(`/api/healthcare/visits/${visitId}/sign`, { method: 'POST' });
            }

            // Complete the visit
            const res = await fetch(`/api/healthcare/visits/${visitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'COMPLETED',
                    isCompleted: true,
                    completedAt: new Date().toISOString(),
                }),
            });

            if (!res.ok) throw new Error('Failed to complete');
            toast.success('Consultation completed');
            router.push('/healthcare/consultation');
        } catch (error) {
            toast.error('Failed to complete consultation');
        } finally {
            setSaving(false);
        }
    };

    const handleAdmitPatient = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/healthcare/visits/${visitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RECOMMENDED_ADMISSION' }),
            });

            if (!res.ok) throw new Error('Failed to update');
            toast.success('Patient marked for admission');
            router.push('/healthcare/consultation');
        } catch (error) {
            toast.error('Failed to mark for admission');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500">Loading consultation...</p>
            </div>
        );
    }

    if (!visit) {
        return null;
    }

    const allPrescriptionsSigned = prescriptions.every(p => p.isSignedByDoctor);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/healthcare/consultation')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">Token #{visit.visitNumber}</h1>
                            <Badge className={visit.type === 'ETU' ? 'bg-red-500' : 'bg-blue-500'}>{visit.type}</Badge>
                        </div>
                        <p className="text-gray-600">
                            {visit.patient.firstName} {visit.patient.lastName} • {visit.patient.patientNumber}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleAdmitPatient} disabled={saving}>
                        <BedDouble className="mr-2 h-4 w-4" /> Admit Patient
                    </Button>
                    <Button onClick={handleCompleteConsultation} disabled={saving} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-2 h-4 w-4" /> Complete Consultation
                    </Button>
                </div>
            </div>

            {/* Patient Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Gender/Age</p>
                            <p className="font-medium">{visit.patient.gender}/{calculateAge(visit.patient.dateOfBirth)}yrs</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Blood Group</p>
                            <p className="font-medium">{visit.patient.bloodGroup || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium">{visit.patient.phone || '-'}</p>
                        </div>
                        {visit.patient.allergies && (
                            <div className="col-span-2">
                                <p className="text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" /> Allergies
                                </p>
                                <p className="font-medium text-red-700">{visit.patient.allergies}</p>
                            </div>
                        )}
                        {visit.patient.chronicConditions && (
                            <div className="col-span-2">
                                <p className="text-gray-500">Chronic Conditions</p>
                                <p className="font-medium">{visit.patient.chronicConditions}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="vitals" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="vitals">Vitals</TabsTrigger>
                    <TabsTrigger value="clinical">Clinical</TabsTrigger>
                    <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
                    <TabsTrigger value="labs">Lab Orders ({labOrders.length})</TabsTrigger>
                </TabsList>

                {/* Vitals Tab */}
                <TabsContent value="vitals">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vital Signs</CardTitle>
                            <CardDescription>Record patient vital signs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="space-y-2">
                                    <Label>Blood Pressure</Label>
                                    <Input
                                        placeholder="120/80"
                                        value={vitals.bloodPressure}
                                        onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Temperature (°F)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="98.6"
                                        value={vitals.temperature}
                                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pulse (bpm)</Label>
                                    <Input
                                        type="number"
                                        placeholder="72"
                                        value={vitals.pulse}
                                        onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Weight (kg)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="70"
                                        value={vitals.weight}
                                        onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Height (cm)</Label>
                                    <Input
                                        type="number"
                                        placeholder="170"
                                        value={vitals.height}
                                        onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleSaveVitals} disabled={saving}>
                                <Save className="mr-2 h-4 w-4" /> Save Vitals
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Clinical Tab */}
                <TabsContent value="clinical">
                    <Card>
                        <CardHeader>
                            <CardTitle>Clinical Information</CardTitle>
                            <CardDescription>Record symptoms and diagnosis</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Chief Complaint</Label>
                                    <Textarea
                                        placeholder="Main reason for visit..."
                                        value={clinicalData.chiefComplaint}
                                        onChange={(e) => setClinicalData({ ...clinicalData, chiefComplaint: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Symptoms</Label>
                                    <Textarea
                                        placeholder="Observed symptoms..."
                                        value={clinicalData.symptoms}
                                        onChange={(e) => setClinicalData({ ...clinicalData, symptoms: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Diagnosis</Label>
                                <Textarea
                                    placeholder="Diagnosis and findings..."
                                    value={clinicalData.diagnosis}
                                    onChange={(e) => setClinicalData({ ...clinicalData, diagnosis: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    placeholder="Additional notes..."
                                    value={clinicalData.notes}
                                    onChange={(e) => setClinicalData({ ...clinicalData, notes: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <Button onClick={handleSaveClinicalData} disabled={saving}>
                                <Save className="mr-2 h-4 w-4" /> Save Clinical Data
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Prescriptions Tab */}
                <TabsContent value="prescriptions">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Prescriptions</CardTitle>
                                <CardDescription>Medications prescribed for this visit</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {prescriptions.length > 0 && !allPrescriptionsSigned && (
                                    <Button variant="outline" onClick={handleSignPrescriptions}>
                                        <FileSignature className="mr-2 h-4 w-4" /> Sign All
                                    </Button>
                                )}
                                <Dialog open={isPrescriptionDialogOpen} onOpenChange={setIsPrescriptionDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" /> Add Prescription
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add Prescription</DialogTitle>
                                            <DialogDescription>Prescribe medication for the patient</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Medication *</Label>
                                                <Input
                                                    placeholder="e.g., Paracetamol 500mg"
                                                    value={newPrescription.medication}
                                                    onChange={(e) => setNewPrescription({ ...newPrescription, medication: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Dosage *</Label>
                                                    <Input
                                                        placeholder="e.g., 1 tablet"
                                                        value={newPrescription.dosage}
                                                        onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Frequency *</Label>
                                                    <Select
                                                        value={newPrescription.frequency}
                                                        onValueChange={(value) => setNewPrescription({ ...newPrescription, frequency: value })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="OD">Once daily (OD)</SelectItem>
                                                            <SelectItem value="BD">Twice daily (BD)</SelectItem>
                                                            <SelectItem value="TDS">Thrice daily (TDS)</SelectItem>
                                                            <SelectItem value="QID">Four times (QID)</SelectItem>
                                                            <SelectItem value="SOS">As needed (SOS)</SelectItem>
                                                            <SelectItem value="STAT">Immediately (STAT)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Duration *</Label>
                                                    <Input
                                                        placeholder="e.g., 5 days"
                                                        value={newPrescription.duration}
                                                        onChange={(e) => setNewPrescription({ ...newPrescription, duration: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Quantity</Label>
                                                    <Input
                                                        type="number"
                                                        value={newPrescription.quantity}
                                                        onChange={(e) => setNewPrescription({ ...newPrescription, quantity: parseInt(e.target.value) || 1 })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Special Instructions</Label>
                                                <Textarea
                                                    placeholder="e.g., Take after meals"
                                                    value={newPrescription.instructions}
                                                    onChange={(e) => setNewPrescription({ ...newPrescription, instructions: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline">Cancel</Button>
                                            </DialogClose>
                                            <Button
                                                onClick={handleAddPrescription}
                                                disabled={!newPrescription.medication || !newPrescription.dosage || !newPrescription.frequency || !newPrescription.duration}
                                            >
                                                Add Prescription
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {prescriptions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No prescriptions added yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {prescriptions.map((rx, index) => (
                                        <div key={rx.id} className="flex items-center justify-between p-4 rounded-lg border">
                                            <div>
                                                <p className="font-semibold">{index + 1}. {rx.medication}</p>
                                                <p className="text-sm text-gray-600">
                                                    {rx.dosage} • {rx.frequency} • {rx.duration} • Qty: {rx.quantity}
                                                </p>
                                                {rx.instructions && (
                                                    <p className="text-sm text-gray-500 mt-1">Instructions: {rx.instructions}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {rx.isSignedByDoctor ? (
                                                    <Badge className="bg-green-100 text-green-800">Signed</Badge>
                                                ) : (
                                                    <Badge variant="outline">Unsigned</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Lab Orders Tab */}
                <TabsContent value="labs">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Lab Orders</CardTitle>
                                <CardDescription>Laboratory tests ordered for this visit</CardDescription>
                            </div>
                            <Dialog open={isLabDialogOpen} onOpenChange={setIsLabDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" /> Order Lab Test
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Order Lab Test</DialogTitle>
                                        <DialogDescription>Select a test to order</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label>Select Test</Label>
                                        <Select value={selectedLabTest} onValueChange={setSelectedLabTest}>
                                            <SelectTrigger><SelectValue placeholder="Choose a test" /></SelectTrigger>
                                            <SelectContent>
                                                {labTests.map((test) => (
                                                    <SelectItem key={test.id} value={test.id}>
                                                        {test.name} ({test.code}) - Rs.{test.price}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleAddLabOrder} disabled={!selectedLabTest}>
                                            Order Test
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {labOrders.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No lab tests ordered yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {labOrders.map((order) => (
                                        <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border">
                                            <div>
                                                <p className="font-semibold">{order.labTest.name}</p>
                                                <p className="text-sm text-gray-600">
                                                    {order.orderNumber} • {order.labTest.category} • Rs.{order.labTest.price}
                                                </p>
                                            </div>
                                            <Badge variant={order.status === 'PENDING' ? 'secondary' : 'default'}>
                                                {order.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
