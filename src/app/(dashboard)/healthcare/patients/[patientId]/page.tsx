"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Calendar, Pill, FlaskConical, BedDouble, Clock, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string | null;
    phone: string | null;
    email: string | null;
    allergies: string | null;
    chronicConditions: string | null;
    status: string;
    createdAt: string;
    visits: Visit[];
    admissions: Admission[];
}

interface Visit {
    id: string;
    visitNumber: number;
    visitDate: string;
    type: string;
    status: string;
    chiefComplaint: string | null;
    diagnosis: string | null;
    prescriptions: Prescription[];
    labOrders: LabOrder[];
}

interface Prescription {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    isSignedByDoctor: boolean;
    dispensedAt: string | null;
}

interface LabOrder {
    id: string;
    testName: string;
    status: string;
    result: string | null;
}

interface Admission {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    dischargeDate: string | null;
    status: string;
    bed: {
        bedNumber: string;
        ward: { name: string };
    };
}

export default function PatientHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const patientId = params.patientId as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPatient = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/healthcare/patients/${patientId}`);
            if (res.ok) {
                const data = await res.json();
                setPatient(data);
            } else {
                toast.error('Patient not found');
                router.push('/healthcare/patients');
            }
        } catch (error) {
            console.error('Error fetching patient:', error);
            toast.error('Failed to load patient');
        } finally {
            setLoading(false);
        }
    }, [patientId, router]);

    useEffect(() => {
        fetchPatient();
    }, [fetchPatient]);

    const calculateAge = (dob: string) => {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!patient) return null;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0tNCAwSDMwVjBoMnYzNHptLTQgMEgyOFYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDIwVjBoMnYzNHptLTQgMEgxNlYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDhWMGgydjM0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/healthcare/patients')} className="text-white hover:bg-white/20">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">
                                {patient.firstName} {patient.lastName}
                            </h1>
                            <div className="flex items-center gap-3 mt-1 text-purple-100">
                                <span className="font-mono">{patient.patientNumber}</span>
                                <span>•</span>
                                <span>{patient.gender}/{calculateAge(patient.dateOfBirth)}yrs</span>
                                {patient.bloodGroup && <><span>•</span><span>{patient.bloodGroup}</span></>}
                                {patient.phone && <><span>•</span><span>{patient.phone}</span></>}
                            </div>
                        </div>
                    </div>
                    <Badge className={patient.status === 'ACTIVE' ? 'bg-green-500/30 text-white' : 'bg-gray-500/30 text-white'}>
                        {patient.status}
                    </Badge>
                </div>
                {(patient.allergies || patient.chronicConditions) && (
                    <div className="mt-4 flex gap-4">
                        {patient.allergies && (
                            <div className="rounded-lg bg-red-500/30 p-3 border border-red-300/50 flex-1">
                                <span className="font-semibold">⚠️ Allergies:</span> {patient.allergies}
                            </div>
                        )}
                        {patient.chronicConditions && (
                            <div className="rounded-lg bg-amber-500/30 p-3 border border-amber-300/50 flex-1">
                                <span className="font-semibold">📋 Chronic:</span> {patient.chronicConditions}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
                    <CardContent className="relative flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-blue-600">Total Visits</p>
                            <p className="mt-1 text-4xl font-bold text-blue-700">{patient.visits.length}</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-lg">
                            <Calendar className="h-7 w-7" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-100 shadow-lg">
                    <CardContent className="relative flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-emerald-600">Prescriptions</p>
                            <p className="mt-1 text-4xl font-bold text-emerald-700">
                                {patient.visits.reduce((sum, v) => sum + v.prescriptions.length, 0)}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-lg">
                            <Pill className="h-7 w-7" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 to-cyan-100 shadow-lg">
                    <CardContent className="relative flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-teal-600">Lab Tests</p>
                            <p className="mt-1 text-4xl font-bold text-teal-700">
                                {patient.visits.reduce((sum, v) => sum + v.labOrders.length, 0)}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-4 text-white shadow-lg">
                            <FlaskConical className="h-7 w-7" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-violet-100 shadow-lg">
                    <CardContent className="relative flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-purple-600">Admissions</p>
                            <p className="mt-1 text-4xl font-bold text-purple-700">{patient.admissions.length}</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-4 text-white shadow-lg">
                            <BedDouble className="h-7 w-7" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="visits" className="w-full">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="visits" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                        <Calendar className="h-4 w-4" /> Visits
                    </TabsTrigger>
                    <TabsTrigger value="admissions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                        <BedDouble className="h-4 w-4" /> Admissions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="visits" className="space-y-4">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                Visit History
                            </CardTitle>
                            <CardDescription>All outpatient visits and consultations</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            {patient.visits.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <Calendar className="h-12 w-12 mb-4 text-gray-300" />
                                    <p>No visits recorded</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {patient.visits.map((visit) => (
                                        <div key={visit.id} className="rounded-xl border p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Badge className="bg-blue-100 text-blue-800">#{visit.visitNumber}</Badge>
                                                    <span className="font-medium">{formatDate(visit.visitDate)}</span>
                                                    <Badge variant="outline">{visit.type}</Badge>
                                                </div>
                                                <Badge className={
                                                    visit.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                        visit.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }>
                                                    {visit.status}
                                                </Badge>
                                            </div>
                                            {visit.chiefComplaint && (
                                                <p className="text-sm text-gray-600 mb-2"><strong>Complaint:</strong> {visit.chiefComplaint}</p>
                                            )}
                                            {visit.diagnosis && (
                                                <p className="text-sm text-gray-600 mb-2"><strong>Diagnosis:</strong> {visit.diagnosis}</p>
                                            )}
                                            <div className="flex gap-4 mt-3 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Pill className="h-4 w-4" /> {visit.prescriptions.length} prescriptions
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FlaskConical className="h-4 w-4" /> {visit.labOrders.length} lab tests
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="admissions" className="space-y-4">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50">
                            <CardTitle className="flex items-center gap-2">
                                <BedDouble className="h-5 w-5 text-purple-500" />
                                Admission History
                            </CardTitle>
                            <CardDescription>All inpatient admissions</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            {patient.admissions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <BedDouble className="h-12 w-12 mb-4 text-gray-300" />
                                    <p>No admissions recorded</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {patient.admissions.map((admission) => (
                                        <div key={admission.id} className="rounded-xl border p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-medium">{admission.admissionNumber}</span>
                                                    <Badge variant="outline">{admission.bed.ward.name}</Badge>
                                                    <Badge>{admission.bed.bedNumber}</Badge>
                                                </div>
                                                <Badge className={
                                                    admission.status === 'ADMITTED' ? 'bg-blue-100 text-blue-800' :
                                                        admission.status === 'DISCHARGED' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }>
                                                    {admission.status}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-4 text-sm text-gray-600">
                                                <span><strong>Admitted:</strong> {formatDate(admission.admissionDate)}</span>
                                                {admission.dischargeDate && (
                                                    <span><strong>Discharged:</strong> {formatDate(admission.dischargeDate)}</span>
                                                )}
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
