'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
  managerId: z.string().optional(),
  parentDepartmentId: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface DepartmentFormProps {
  initialData?: Partial<DepartmentFormData> & { id?: string };
  employees: Employee[];
  departments: Department[];
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  onCancel: () => void;
}

export function DepartmentForm({
  initialData,
  employees,
  departments,
  onSubmit,
  onCancel,
}: DepartmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      managerId: initialData?.managerId || '',
      parentDepartmentId: initialData?.parentDepartmentId || '',
      description: initialData?.description || '',
      isActive: initialData?.isActive ?? true,
    },
  });

  const onFormSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out current department from parent options to prevent circular reference
  const availableParentDepartments = departments.filter((d) => d.id !== initialData?.id);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Department Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Sales Department"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="SALES"
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>}
            </div>

            <div>
              <Label htmlFor="managerId">Department Manager</Label>
              <Select
                value={watch('managerId')}
                onValueChange={(value) => setValue('managerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="parentDepartmentId">Parent Department</Label>
              <Select
                value={watch('parentDepartmentId')}
                onValueChange={(value) => setValue('parentDepartmentId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Top Level)</SelectItem>
                  {availableParentDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of the department"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <Label htmlFor="isActive" className="ml-2 cursor-pointer">
              Active
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Department' : 'Create Department'}
        </Button>
      </div>
    </form>
  );
}
