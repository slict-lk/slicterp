// HR & People API Functions
import { prisma } from '@/lib/prisma';
import type { Employee, Department, Attendance } from './types';

const client = prisma as any;

export async function getEmployees(tenantId: string) {
  return await client.employee.findMany({
    where: { tenantId },
    include: {
      department: true,
      manager: true,
    },
    orderBy: { lastName: 'asc' },
  });
}

export async function createEmployee(data: Partial<Employee> & { tenantId: string }) {
  return await client.employee.create({
    data: {
      employeeNumber: data.employeeNumber!,
      firstName: data.firstName!,
      lastName: data.lastName!,
      email: data.email!,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      position: data.position!,
      hireDate: data.hireDate || new Date(),
      status: data.status || 'ACTIVE',
      departmentId: data.departmentId,
      managerId: data.managerId,
      salary: data.salary,
      tenantId: data.tenantId,
    },
  });
}

export async function getDepartments(tenantId: string) {
  return await client.department.findMany({
    where: { tenantId },
    include: {
      parent: true,
      children: true,
      employees: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function getAttendances(tenantId: string, employeeId?: string) {
  return await client.attendance.findMany({
    where: {
      tenantId,
      ...(employeeId && { employeeId }),
    },
    include: { employee: true },
    orderBy: { date: 'desc' },
  });
}
