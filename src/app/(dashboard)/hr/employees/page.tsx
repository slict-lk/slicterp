'use client';

import { useState, useEffect } from 'react';
import { EmployeeList } from '@/components/hr/EmployeeList';
import { EmployeeForm } from '@/components/hr/EmployeeForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  hireDate: Date;
  dateOfBirth?: Date;
  isActive: boolean;
  salary?: number;
  departmentId?: string;
  department?: {
    id: string;
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/hr/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const handleCreateEmployee = async (data: any) => {
    try {
      const response = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadEmployees();
        setViewMode('list');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    }
  };

  const handleUpdateEmployee = async (data: any) => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`/api/hr/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadEmployees();
        setViewMode('list');
        setSelectedEmployee(null);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/hr/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadEmployees();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {viewMode === 'list' ? (
        <EmployeeList
          employees={employees}
          onCreateNew={() => setViewMode('create')}
          onEdit={(employee) => {
            setSelectedEmployee(employee);
            setViewMode('edit');
          }}
          onDelete={handleDeleteEmployee}
          onView={(employee) => {
            setSelectedEmployee(employee);
            setViewMode('edit');
          }}
        />
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Add New Employee' : 'Edit Employee'}
          </h1>
          <EmployeeForm
            initialData={selectedEmployee ? {
              ...selectedEmployee,
              hireDate: selectedEmployee.hireDate
                ? new Date(selectedEmployee.hireDate).toISOString().split('T')[0]
                : '',
              dateOfBirth: selectedEmployee.dateOfBirth
                ? new Date(selectedEmployee.dateOfBirth).toISOString().split('T')[0]
                : undefined
            } : undefined}
            departments={departments}
            onSubmit={viewMode === 'create' ? handleCreateEmployee : handleUpdateEmployee}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}
