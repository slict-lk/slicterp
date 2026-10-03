"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, DollarSign, UserCheck, RefreshCw, Briefcase, Clock } from 'lucide-react';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  position: string;
  isActive: boolean;
  department: { name: string } | null;
}

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  employee: { name: string };
}

interface Attendance {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  employee: { name: string };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date));
}

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [employeesRes, leaveRes, attendanceRes] = await Promise.all([
        fetch('/api/hr/employees'),
        fetch('/api/hr/leave-requests'),
        fetch('/api/hr/attendance'),
      ]);

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setLeaveRequests(Array.isArray(data) ? data : []);
      }
      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        setAttendance(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(error);
      // Ensure arrays are set even on error
      setEmployees([]);
      setLeaveRequests([]);
      setAttendance([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Safe array filtering with fallback
  const activeEmployees = useMemo(() => (Array.isArray(employees) ? employees.filter((e) => e.isActive).length : 0), [employees]);
  const pendingLeaves = useMemo(() => (Array.isArray(leaveRequests) ? leaveRequests.filter((r) => r.status === 'PENDING').length : 0), [leaveRequests]);
  const todayAttendance = useMemo(() => {
    if (!Array.isArray(attendance)) return 0;
    const today = new Date().toISOString().split('T')[0];
    return attendance.filter((a) => a.date.startsWith(today)).length;
  }, [attendance]);
  const attendanceRate = activeEmployees > 0 ? Math.round((todayAttendance / activeEmployees) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Human Resources</h1>
          <p className="text-gray-600">Workforce management, attendance, and employee lifecycle.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Employees" value={String(activeEmployees)} subtitle="Active workforce" icon={Users} variant="blue" />
        <StatCard title="Attendance Today" value={`${attendanceRate}%`} subtitle={`${todayAttendance}/${activeEmployees} checked in`} icon={UserCheck} variant="green" />
        <StatCard title="Leave Requests" value={String(pendingLeaves)} subtitle="Pending approval" icon={Calendar} variant="amber" />
        <StatCard title="Departments" value="0" subtitle="Organizational units" icon={Briefcase} variant="purple" />
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Manage workforce and organizational structure.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading employees..." />
              ) : employees.length === 0 ? (
                <EmptyState message="No employees found." />
              ) : (
                <div className="space-y-3">
                  {employees.slice(0, 10).map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-semibold">{employee.name.charAt(0)}</div>
                        <div>
                          <p className="font-semibold text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.position} · {employee.department?.name ?? 'No dept'}</p>
                        </div>
                      </div>
                       <Badge variant={employee.isActive ? 'default' : 'secondary'}>{employee.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Tracking</CardTitle>
              <CardDescription>Monitor employee check-ins and work hours.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading attendance..." />
              ) : attendance.length === 0 ? (
                <EmptyState message="No attendance records." />
              ) : (
                <div className="space-y-3">
                  {attendance.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-2"><Clock className="h-4 w-4 text-green-600" /></div>
                        <div>
                          <p className="font-semibold text-gray-900">{record.employee.name}</p>
                          <p className="text-xs text-gray-500">In: {record.checkIn} {record.checkOut && `· Out: ${record.checkOut}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{record.status}</Badge>
                        <p className="text-xs text-gray-500">{formatDate(record.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Management</CardTitle>
              <CardDescription>Review and approve employee leave requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading leave requests..." />
              ) : leaveRequests.length === 0 ? (
                <EmptyState message="No leave requests." />
              ) : (
                <div className="space-y-3">
                  {leaveRequests.slice(0, 10).map((request) => (
                    <div key={request.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-100 p-2"><Calendar className="h-4 w-4 text-amber-600" /></div>
                        <div>
                          <p className="font-semibold text-gray-900">{request.employee.name}</p>
                          <p className="text-xs text-gray-500">{request.type} · {formatDate(request.startDate)} - {formatDate(request.endDate)}</p>
                        </div>
                      </div>
                      <Badge variant={request.status === 'PENDING' ? 'outline' : request.status === 'APPROVED' ? 'default' : 'destructive'}>{request.status}</Badge>
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

function StatCard({ title, value, subtitle, icon: Icon, variant }: { title: string; value: string; subtitle: string; icon: typeof Users; variant: 'blue' | 'green' | 'amber' | 'purple' }) {
  const accentMap = { blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600', amber: 'bg-amber-100 text-amber-600', purple: 'bg-purple-100 text-purple-600' } as const;
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
