"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Activity, Thermometer, Heart, Wind, Droplets, Plus, Clock, BedDouble, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    patientNumber: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string | null;
    phone: string | null;
    allergies: string | null;
}

interface Bed {
    id: string;
    bedNumber: string;
    ward: {
        id: string;
        name: string;
    };
}

interface VitalSign {
    id: string;
    temperature: number | null;
    bloodPressureSystolic: number | null;
    bloodPressureDiastolic: number | null;
    pulse: number | null;
    respiratoryRate: number | null;
    oxygenSaturation: number | null;
    notes: string | null;
    recordedAt: string;
}

interface Admission {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    status: string;
    patient: Patient;
    bed: Bed;
    vitals: VitalSign[];
    guardianName: string | null;
    guardianPhone: string | null;
    depositAmount: number;
}

export default function NursingPatientDetailPage() {
    const router = useRouter();
    const params = useParams();
    const admissionId = params.admissionId as string;

    const [admission, setAdmission] = useState<Admission | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingVitals, setSavingVitals] = useState(false);
    const [vitalsForm, setVitalsForm] = useState({
        temperature: '',
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        pulse: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        notes: '',
    });

    const fetchAdmission = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/healthcare/admissions/${admissionId}`);
            if (res.ok) {
                const data = await res.json();
                setAdmission(data);
            } else {
                toast.error('Admission not found');
                router.push('/healthcare/nursing');
            }
        } catch (error) {
            console.error('Error fetching admission:', error);
            toast.error('Failed to load admission');
        } finally {
            setLoading(false);
        }
    }, [admissionId, router]);

    useEffect(() => {
        fetchAdmission();
    }, [fetchAdmission]);

    const handleSaveVitals = async () => {
        try {
            setSavingVitals(true);
            const res = await fetch(`/api/healthcare/admissions/${admissionId}/vitals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    temperature: vitalsForm.temperature ? parseFloat(vitalsForm.temperature) : null,
                    bloodPressureSystolic: vitalsForm.bloodPressureSystolic ? parseInt(vitalsForm.bloodPressureSystolic) : null,
                    bloodPressureDiastolic: vitalsForm.bloodPressureDiastolic ? parseInt(vitalsForm.bloodPressureDiastolic) : null,
                    pulse: vitalsForm.pulse ? parseInt(vitalsForm.pulse) : null,
                    respiratoryRate: vitalsForm.respiratoryRate ? parseInt(vitalsForm.respiratoryRate) : null,
                    oxygenSaturation: vitalsForm.oxygenSaturation ? parseFloat(vitalsForm.oxygenSaturation) : null,
                    notes: vitalsForm.notes || null,
                }),
            });

            if (!res.ok) throw new Error('Failed to save vitals');

            toast.success('Vitals recorded successfully');
            setVitalsForm({
                temperature: '',
                bloodPressureSystolic: '',
                bloodPressureDiastolic: '',
                pulse: '',
                respiratoryRate: '',
                oxygenSaturation: '',
                notes: '',
            });
            fetchAdmission();
        } catch (error) {
            toast.error('Failed to save vitals');
        } finally {
            setSavingVitals(false);
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

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!admission) return null;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0tNCAwSDMwVjBoMnYzNHptLTQgMEgyOFYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDIwVjBoMnYzNHptLTQgMEgxNlYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDhWMGgydjM0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/healthcare/nursing')} className="text-white hover:bg-white/20">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">
                                    {admission.patient.firstName} {admission.patient.lastName}
                                </h1>
                                <Badge className="bg-white/20 text-white">{admission.bed.bedNumber}</Badge>
                            </div>
                            <p className="mt-1 text-purple-100">
                                {admission.patient.patientNumber} • {admission.patient.gender}/{calculateAge(admission.patient.dateOfBirth)}yrs
                                {admission.patient.bloodGroup && ` • ${admission.patient.bloodGroup}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-end gap-3">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                <BedDouble className="h-4 w-4" />
                                <span>{admission.bed.ward.name}</span>
                            </div>
                            <span className="text-sm text-purple-200">{admission.admissionNumber}</span>
                        </div>
                        <Button
                            className="bg-white/20 hover:bg-white/30 text-white border-0 hidden md:flex"
                            onClick={() => router.push(`/healthcare/admission/discharge/${admission.id}`)}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Discharge
                        </Button>
                    </div>
                </div>
                {admission.patient.allergies && (
                    <div className="mt-4 rounded-lg bg-red-500/30 p-3 border border-red-300/50">
                        <span className="font-semibold">⚠️ Allergies:</span> {admission.patient.allergies}
                    </div>
                )}
            </div>

            <Tabs defaultValue="vitals" className="w-full">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="vitals" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                        <Activity className="h-4 w-4" /> Vitals
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                        <Clock className="h-4 w-4" /> History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="vitals" className="space-y-4">
                    {/* Record New Vitals */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-purple-50">
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5 text-violet-500" />
                                Record Vitals
                            </CardTitle>
                            <CardDescription>Enter current vital signs for this patient</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Thermometer className="h-4 w-4 text-red-500" /> Temperature °F
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="98.6"
                                        value={vitalsForm.temperature}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Heart className="h-4 w-4 text-red-500" /> BP Systolic
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="120"
                                        value={vitalsForm.bloodPressureSystolic}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureSystolic: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Heart className="h-4 w-4 text-red-500" /> BP Diastolic
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="80"
                                        value={vitalsForm.bloodPressureDiastolic}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureDiastolic: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Activity className="h-4 w-4 text-pink-500" /> Pulse (bpm)
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="72"
                                        value={vitalsForm.pulse}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Wind className="h-4 w-4 text-blue-500" /> Resp. Rate
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="16"
                                        value={vitalsForm.respiratoryRate}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Droplets className="h-4 w-4 text-cyan-500" /> SpO2 %
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="98"
                                        value={vitalsForm.oxygenSaturation}
                                        onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturation: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <Label>Notes</Label>
                                <Input
                                    placeholder="Optional notes about the reading..."
                                    value={vitalsForm.notes}
                                    onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                                />
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSaveVitals} disabled={savingVitals} className="bg-gradient-to-r from-violet-600 to-purple-600">
                                    <Save className="mr-2 h-4 w-4" />
                                    {savingVitals ? 'Saving...' : 'Save Vitals'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Latest Vitals Summary */}
                    {admission.vitals.length > 0 && (
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle>Latest Reading</CardTitle>
                                <CardDescription>
                                    Recorded {formatDateTime(admission.vitals[0].recordedAt)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                    {[
                                        { label: 'Temp', value: admission.vitals[0].temperature, unit: '°F', icon: Thermometer, color: 'text-red-500' },
                                        { label: 'BP', value: admission.vitals[0].bloodPressureSystolic && admission.vitals[0].bloodPressureDiastolic ? `${admission.vitals[0].bloodPressureSystolic}/${admission.vitals[0].bloodPressureDiastolic}` : null, unit: '', icon: Heart, color: 'text-red-500' },
                                        { label: 'Pulse', value: admission.vitals[0].pulse, unit: 'bpm', icon: Activity, color: 'text-pink-500' },
                                        { label: 'Resp', value: admission.vitals[0].respiratoryRate, unit: '/min', icon: Wind, color: 'text-blue-500' },
                                        { label: 'SpO2', value: admission.vitals[0].oxygenSaturation, unit: '%', icon: Droplets, color: 'text-cyan-500' },
                                    ].map((vital) => (
                                        <div key={vital.label} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                                            <vital.icon className={`h-6 w-6 ${vital.color}`} />
                                            <div>
                                                <p className="text-xs text-gray-500">{vital.label}</p>
                                                <p className="font-bold text-lg">
                                                    {vital.value ?? '--'}{vital.value ? vital.unit : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-slate-500" />
                                Vitals History
                            </CardTitle>
                            <CardDescription>All vital sign recordings for this admission</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            {admission.vitals.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <Activity className="h-12 w-12 mb-4 text-gray-300" />
                                    <p>No vitals recorded yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {admission.vitals.map((vital) => (
                                        <div key={vital.id} className="rounded-lg border p-4 hover:bg-gray-50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {formatDateTime(vital.recordedAt)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                                                <div><span className="text-gray-500">Temp:</span> {vital.temperature ?? '--'}°F</div>
                                                <div><span className="text-gray-500">BP:</span> {vital.bloodPressureSystolic && vital.bloodPressureDiastolic ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}` : '--'}</div>
                                                <div><span className="text-gray-500">Pulse:</span> {vital.pulse ?? '--'} bpm</div>
                                                <div><span className="text-gray-500">Resp:</span> {vital.respiratoryRate ?? '--'}/min</div>
                                                <div><span className="text-gray-500">SpO2:</span> {vital.oxygenSaturation ?? '--'}%</div>
                                                {vital.notes && <div className="col-span-3 md:col-span-6 text-gray-600">📝 {vital.notes}</div>}
                                            </div>
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
