import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, X, Eye, EyeOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AVAILABLE_MODULES, MODULE_CATEGORIES, generateDefaultModulePermissions, ModulePermissions } from '@/lib/modules';
import { convertPermissionsToModulePermissions } from '@/lib/rbac';

// Dynamically generate permissions schema
const permissionsSchema = z.record(z.boolean());

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.string().min(1, 'Role is required'), // Changed from enum to string
  department: z.string().optional(),
  isActive: z.boolean(),
  // Allow dynamic keys for permissions
  permissions: z.record(z.any()),
  roleId: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: Partial<UserFormData> & { id?: string; permissions?: any };
  onSubmit: (data: UserFormData & { modulePermissions?: ModulePermissions }) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ initialData, onSubmit, onCancel }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [roles, setRoles] = useState<any[]>([]);

  // Initialize default permissions based on available modules
  const defaultPermissions: Record<string, boolean> = {};
  AVAILABLE_MODULES.forEach(m => {
    defaultPermissions[m.id] = false;
  });

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch('/api/rbac/roles');
        if (res.ok) {
          const json = await res.json();
          setRoles(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch roles', err);
      }
    }
    fetchRoles();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || 'USER',
      department: initialData?.department || '',
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
      permissions: initialData?.permissions || defaultPermissions,
    },
  });

  const role = watch('role');
  const roleId = watch('roleId');
  const isActive = watch('isActive');
  const currentPermissions = watch('permissions');

  // Update permissions when role changes
  const handleRoleChange = (selectedRoleId: string) => {
    // Find selected role object
    const selectedRole = roles.find(r => r.id === selectedRoleId);

    if (selectedRole) {
      // It's a DB role
      setValue('roleId', selectedRole.id);
      setValue('role', selectedRole.code as any);

      // Update permissions from role
      const newPermissions: Record<string, boolean> = {};
      const rolePerms = selectedRole.permissions;

      if (Array.isArray(rolePerms)) {
        // New RBAC format: String[]
        const modulePermissions = convertPermissionsToModulePermissions(rolePerms as string[]);
        // Flatten for form checkboxes
        Object.keys(modulePermissions).forEach(key => {
          newPermissions[key] = modulePermissions[key].enabled;
        });
      } else if (rolePerms && typeof rolePerms === 'object') {
        // Legacy format: JSON
        Object.keys(rolePerms).forEach(key => {
          newPermissions[key] = rolePerms[key].enabled;
        });
      }

      setValue('permissions', newPermissions);

    } else {
      console.warn('Selected role ID not found in roles list:', selectedRoleId);
    }
  };

  const onFormSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      // Transform flat permissions back to ModulePermissions structure
      const modulePermissions: ModulePermissions = {};
      const defaults = generateDefaultModulePermissions(data.role as any);

      Object.keys(data.permissions).forEach(moduleId => {
        const isEnabled = data.permissions[moduleId];
        const defaultPerm = defaults[moduleId] || {
          enabled: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        };

        modulePermissions[moduleId] = {
          ...defaultPerm,
          enabled: isEnabled,
          // If enabled, ensure view is true
          view: isEnabled ? true : false,
        };
      });

      await onSubmit({
        ...data,
        modulePermissions,
        // roleId is already in data if we added it to schema
        roleId: data.roleId
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current user's enabled modules to filter the list
  const { data: session } = useSession();
  const enabledModuleIds = session?.user?.enabledModuleIds || [];
  const isSuperAdmin = session?.user?.isSuperAdmin;

  // Group modules by category
  const modulesByCategory = MODULE_CATEGORIES.map(category => ({
    ...category,
    modules: AVAILABLE_MODULES.filter(m => {
      // Show module if it belongs to category AND
      // (User is Super Admin OR Module is in user's enabled list)
      return m.category === category.id && (isSuperAdmin || enabledModuleIds.includes(m.id));
    })
  })).filter(cat => cat.modules.length > 0);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="John Doe"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john.doe@company.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">
                Password {!initialData?.id && '*'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder={initialData?.id ? 'Leave blank to keep current' : 'Min 8 characters'}
                  className={errors.password ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={watch('roleId') || ''} onValueChange={handleRoleChange}>
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                {...register('department')}
                placeholder="Sales, IT, HR..."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active Account
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Module Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {roleId ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
                <p className="font-medium mb-2">✓ Permissions inherited from selected role</p>
                <p className="text-sm">
                  The <strong>{roles.find(r => r.id === roleId)?.name}</strong> role comes with pre-configured permissions.
                  These will be automatically assigned to this user.
                </p>
              </div>

              <details className="border rounded-lg">
                <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-medium text-sm">
                  👁️ View inherited permissions ({Object.values(currentPermissions).filter(Boolean).length} modules enabled)
                </summary>
                <div className="px-4 py-3 border-t bg-gray-50">
                  <div className="space-y-4">
                    {modulesByCategory.map(category => {
                      const enabledInCategory = category.modules.filter(m => currentPermissions?.[m.id]);
                      if (enabledInCategory.length === 0) return null;

                      return (
                        <div key={category.id}>
                          <h4 className="font-medium text-gray-700 mb-2">{category.name}</h4>
                          <div className="flex flex-wrap gap-2">
                            {enabledInCategory.map(module => (
                              <span key={module.id} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                                ✓ {module.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-4">
                ⚠️ Please select a role first to configure permissions.
              </div>

              {modulesByCategory.map(category => (
                <div key={category.id} className="border-b pb-4 last:border-0">
                  <h3 className="font-medium text-gray-900 mb-3">{category.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.modules.map(module => (
                      <div key={module.id} className="flex items-center space-x-2">
                        <Switch
                          id={`module-${module.id}`}
                          checked={currentPermissions?.[module.id] || false}
                          onCheckedChange={(checked) => {
                            setValue(`permissions.${module.id}`, checked);
                          }}
                        />
                        <Label htmlFor={`module-${module.id}`} className="cursor-pointer">
                          {module.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
