'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Building, Users } from 'lucide-react';

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

interface DepartmentListProps {
  departments: Department[];
  onCreateNew: () => void;
  onEdit: (department: Department) => void;
  onDelete: (departmentId: string) => void;
  onView: (department: Department) => void;
}

export function DepartmentList({
  departments,
  onCreateNew,
  onEdit,
  onDelete,
  onView,
}: DepartmentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredDepartments = departments.filter((department) => {
    const matchesSearch =
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && department.isActive) ||
      (filterStatus === 'INACTIVE' && !department.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = departments.filter((d) => d.isActive).length;
  const inactiveCount = departments.filter((d) => !d.isActive).length;
  const totalEmployees = departments.reduce((sum, d) => sum + (d._count?.employees || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
          <p className="text-gray-600">
            {activeCount} active · {totalEmployees} total employees
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Department
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'ALL' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('ALL')}
              >
                All ({departments.length})
              </Button>
              <Button
                variant={filterStatus === 'ACTIVE' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('ACTIVE')}
              >
                Active ({activeCount})
              </Button>
              <Button
                variant={filterStatus === 'INACTIVE' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('INACTIVE')}
              >
                Inactive ({inactiveCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Grid */}
      {filteredDepartments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first department'}
              </p>
              {!searchTerm && filterStatus === 'ALL' && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Department
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((department) => (
            <Card
              key={department.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onView(department)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <span className="text-xs text-gray-500">{department.code}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      department.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {department.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {department._count && (
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {department._count.employees}
                      </div>
                      {department._count.subDepartments > 0 && (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {department._count.subDepartments}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {department.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{department.description}</p>
                )}

                {department.manager && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    Manager: {department.manager.firstName} {department.manager.lastName}
                  </div>
                )}

                {department.parentDepartment && (
                  <div className="text-xs text-gray-500">
                    Part of: {department.parentDepartment.name}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(department);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete department ${department.name}?`))
                        onDelete(department.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
