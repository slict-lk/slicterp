"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Calendar, Users, FileText, RefreshCw, Heart, Stethoscope } from 'lucide-react';

interface Patient {
  id: string;
  patientNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string;
  bloodGroup: string | null;
  status: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  patient: { name: string };
  notes: string | null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

function calculateAge(dateOfBirth: string) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function HealthcarePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [patientsRes, appointmentsRes] = await Promise.all([
        fetch('/api/healthcare/patients'),
        fetch('/api/healthcare/appointments'),
      ]);

      if (patientsRes.ok) setPatients((await patientsRes.json()) ?? []);
      if (appointmentsRes.ok) setAppointments((await appointmentsRes.json()) ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activePatients = useMemo(() => patients.filter((p) => p.status === 'ACTIVE').length, [patients]);
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter((a) => a.date.startsWith(today)).length;
  }, [appointments]);
  const upcomingAppointments = useMemo(() => {
    const today = new Date();
    return appointments.filter((a) => new Date(a.date) >= today && a.status !== 'COMPLETED').length;
  }, [appointments]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Healthcare Management</h1>
          <p className="text-gray-600">Patient care, appointments, and medical record management.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Patients" value={String(activePatients)} subtitle={`${patients.length} registered`} icon={Users} variant="red" />
        <StatCard title="Today's Appointments" value={String(todayAppointments)} subtitle={`${upcomingAppointments} upcoming`} icon={Calendar} variant="blue" />
        <StatCard title="Active Cases" value="0" subtitle="Under treatment" icon={Activity} variant="orange" />
        <StatCard title="Medical Records" value={String(patients.length)} subtitle="Digital files" icon={FileText} variant="teal" />
      </div>

      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Registry</CardTitle>
              <CardDescription>Comprehensive patient information and health records.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading patients..." />
              ) : patients.length === 0 ? (
                <EmptyState message="No patients registered yet." />
              ) : (
                <div className="space-y-3">
                  {patients.slice(0, 10).map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 font-semibold">
                          <Heart className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{patient.name}</p>
                          <p className="text-xs text-gray-500">
                            {patient.patientNumber} · Age: {calculateAge(patient.dateOfBirth)} · {patient.bloodGroup || 'Unknown blood group'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={patient.status === 'ACTIVE' ? 'default' : 'secondary'}>{patient.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Schedule</CardTitle>
              <CardDescription>Manage patient consultations and follow-ups.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading appointments..." />
              ) : appointments.length === 0 ? (
                <EmptyState message="No appointments scheduled." />
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 10).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${
                          appointment.status === 'COMPLETED' ? 'bg-green-100' :
                          appointment.status === 'SCHEDULED' ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          <Stethoscope className={`h-4 w-4 ${
                            appointment.status === 'COMPLETED' ? 'text-green-600' :
                            appointment.status === 'SCHEDULED' ? 'text-blue-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{appointment.patient.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(appointment.date)} at {appointment.time} · {appointment.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant={appointment.status === 'COMPLETED' ? 'default' : appointment.status === 'SCHEDULED' ? 'secondary' : 'outline'}>
                        {appointment.status}
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

function StatCard({ title, value, subtitle, icon: Icon, variant }: { title: string; value: string; subtitle: string; icon: typeof Users; variant: 'red' | 'blue' | 'orange' | 'teal' }) {
  const accentMap = { red: 'bg-red-100 text-red-600', blue: 'bg-blue-100 text-blue-600', orange: 'bg-orange-100 text-orange-600', teal: 'bg-teal-100 text-teal-600' } as const;
  return (
    <Card className="border border-gray-200">
      <CardContent className="flex items-center justify-between p-6">
        <div><p className="text-sm font-medium text-gray-500">{title}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500">{subtitle}</p></div>
        <div className={`rounded-xl p-3 ${accentMap[variant]}`}><Icon className="h-6 w-6" /></div>
      </CardContent>
    </Card>
  );
}

function LoadingState({ message }: { message: string }) {
  return <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-gray-500">{message}</div>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-sm text-gray-500">{message}</div>;
}
