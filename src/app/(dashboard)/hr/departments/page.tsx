'use client';

import { useState, useEffect } from 'react';
import { DepartmentList } from '@/components/hr/DepartmentList';
import { DepartmentForm } from '@/components/hr/DepartmentForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  parentDepartmentId?: string;
  parentDepartment?: {
    id: string;
    name: string;
  };
  description?: string;
  isActive: boolean;
  _count?: {
    employees: number;
    subDepartments: number;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDepartments();
    loadEmployees();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/hr/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleCreateDepartment = async (data: any) => {
    try {
      const response = await fetch('/api/hr/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadDepartments();
        setViewMode('list');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      alert('Failed to create department');
    }
  };

  const handleUpdateDepartment = async (data: any) => {
    if (!selectedDepartment) return;

    try {
      const response = await fetch(`/api/hr/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadDepartments();
        setViewMode('list');
        setSelectedDepartment(null);
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('Failed to update department');
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    try {
      const response = await fetch(`/api/hr/departments/${departmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadDepartments();
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Failed to delete department');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading departments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {viewMode === 'list' ? (
        <DepartmentList
          departments={departments}
          onCreateNew={() => setViewMode('create')}
          onEdit={(department) => {
            setSelectedDepartment(department);
            setViewMode('edit');
          }}
          onDelete={handleDeleteDepartment}
          onView={(department) => {
            setSelectedDepartment(department);
            setViewMode('edit');
          }}
        />
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Departments
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Create New Department' : 'Edit Department'}
          </h1>
          <DepartmentForm
            initialData={selectedDepartment || undefined}
            employees={employees}
            departments={departments}
            onSubmit={viewMode === 'create' ? handleCreateDepartment : handleUpdateDepartment}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}
