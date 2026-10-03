"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, RefreshCw, User, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: string;
    dateOfBirth: string;
    bloodGroup: string | null;
    status: string;
    createdAt: string;
    _count?: {
        visits: number;
        admissions: number;
    };
}

export default function PatientsPage() {
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/healthcare/patients');
            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients || data || []);
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            fetchPatients();
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/healthcare/patients/search?q=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients || data || []);
            }
        } catch (error) {
            toast.error('Failed to search patients');
        } finally {
            setLoading(false);
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
                    <p className="text-gray-600">Manage patient records and history</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchPatients}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button onClick={() => router.push('/healthcare/reception')}>
                        <Plus className="mr-2 h-4 w-4" /> New Patient
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Patients</p>
                            <p className="mt-1 text-3xl font-bold text-gray-900">{patients.length}</p>
                        </div>
                        <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                            <User className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active</p>
                            <p className="mt-1 text-3xl font-bold text-green-600">
                                {patients.filter(p => p.status === 'ACTIVE').length}
                            </p>
                        </div>
                        <div className="rounded-xl bg-green-100 p-3 text-green-600">
                            <User className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500">This Month</p>
                            <p className="mt-1 text-3xl font-bold text-purple-600">
                                {patients.filter(p => {
                                    const created = new Date(p.createdAt);
                                    const now = new Date();
                                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                                }).length}
                            </p>
                        </div>
                        <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
                            <User className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Patient List */}
            <Card>
                <CardHeader>
                    <CardTitle>Patient Records</CardTitle>
                    <CardDescription>Search and manage patient information</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search by name, PHN, or phone..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch}>Search</Button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>
                    ) : patients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <User className="h-12 w-12 mb-4 text-gray-300" />
                            <p>No patients found</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>PHN</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Gender/Age</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Blood Group</TableHead>
                                        <TableHead>Visits</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {patients.map((patient) => (
                                        <TableRow key={patient.id}>
                                            <TableCell className="font-mono text-sm">{patient.patientNumber}</TableCell>
                                            <TableCell className="font-medium">
                                                {patient.firstName} {patient.lastName}
                                            </TableCell>
                                            <TableCell>
                                                {patient.gender}/{calculateAge(patient.dateOfBirth)}yrs
                                            </TableCell>
                                            <TableCell>{patient.phone || '-'}</TableCell>
                                            <TableCell>{patient.bloodGroup || '-'}</TableCell>
                                            <TableCell>{patient._count?.visits || 0}</TableCell>
                                            <TableCell>
                                                <Badge className={patient.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                                    {patient.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/healthcare/patients/${patient.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
