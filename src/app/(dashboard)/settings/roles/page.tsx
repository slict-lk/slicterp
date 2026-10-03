'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, Plus, Edit, Trash2, Users, Lock, RefreshCw, Search, Check, X, Filter } from 'lucide-react';
import { formatPermission, groupPermissionsByCategory, SystemRoles } from '@/lib/rbac';
import { getAllPermissions } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  permissions: string[];
  userCount?: number;
  users?: any[];
  createdAt: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/rbac/roles');
      if (res.ok) {
        const json = await res.json();
        setRoles(json.data ?? json ?? []);
        if (json.meta?.enabledModules) {
          setEnabledModules(json.meta.enabledModules);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (roleId: string) => {
    if (!confirm('Delete this role? Users with this role will lose their permissions.')) return;
    try {
      const res = await fetch(`/api/rbac/roles?id=${roleId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRoles();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    fetchRoles();
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-2xl">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Role Management</h1>
          <p className="text-slate-300 text-lg">Define and control access levels across your organization.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={fetchRoles} disabled={refreshing} className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => {
            setEditingRole(null);
            setDialogOpen(true);
          }}
            className="bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-500/30">
            <Plus className="mr-2 h-4 w-4" /> Create New Role
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50">
              <RoleForm
                key={editingRole?.id ?? 'new'}
                initialRole={editingRole}
                enabledModules={enabledModules}
                onSuccess={handleSuccess}
                onCancel={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="py-24 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading roles configuration...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {roles.map(role => {
            const isSystem = Object.keys(SystemRoles).includes(role.code);
            return (
              <Card key={role.id} className={cn(
                "group hover:shadow-xl transition-all duration-300 border-none ring-1 ring-slate-200",
                isSystem ? "bg-gradient-to-br from-blue-50/50 to-indigo-50/50" : "bg-white"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2.5 rounded-xl shadow-sm",
                        isSystem ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      )}>
                        {role.name === 'Admin' ? <Shield className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-900">{role.name}</CardTitle>
                        {isSystem && <span className="text-xs font-medium text-blue-600">System Default</span>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-slate-600 min-h-[40px] leading-relaxed">
                    {role.description || 'No description provided for this role.'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-100">
                    <div className="text-center p-2 rounded-lg bg-slate-50">
                      <div className="text-2xl font-bold text-slate-900">{role.userCount ?? 0}</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Users</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50">
                      <div className="text-2xl font-bold text-slate-900">{role.permissions.length}</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Permissions</div>
                    </div>
                  </div>

                  {!isSystem && (
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={() => handleEdit(role)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit Configuration
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(role.id)} disabled={(role.userCount ?? 0) > 0}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {isSystem && (
                    <div className="pt-2">
                      <Button variant="ghost" className="w-full justify-start text-slate-400 cursor-not-allowed font-normal" disabled>
                        <Lock className="h-3 w-3 mr-2" /> System roles cannot be modified
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface RoleFormProps {
  initialRole: Role | null;
  enabledModules: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

function RoleForm({ initialRole, enabledModules, onSuccess, onCancel }: RoleFormProps) {
  const [formData, setFormData] = useState({
    name: initialRole?.name || '',
    description: initialRole?.description || '',
    permissions: Array.isArray(initialRole?.permissions) ? initialRole!.permissions : []
  });
  const [permissionSearch, setPermissionSearch] = useState('');

  const togglePermission = (permission: string) => {
    setFormData(prev => {
      const currentPermissions = Array.isArray(prev.permissions) ? prev.permissions : [];
      return {
        ...prev,
        permissions: currentPermissions.includes(permission)
          ? currentPermissions.filter(p => p !== permission)
          : [...currentPermissions, permission]
      };
    });
  };

  const toggleCategory = (permissions: string[], shouldSelect: boolean) => {
    setFormData(prev => {
      const newPermissions = new Set(Array.isArray(prev.permissions) ? prev.permissions : []);
      permissions.forEach(p => {
        if (shouldSelect) newPermissions.add(p);
        else newPermissions.delete(p);
      });
      return { ...prev, permissions: Array.from(newPermissions) };
    });
  };

  const permissionGroups = useMemo(() => {
    // Dynamically get permissions instead of using Enum
    // Filter by enabled modules if provided. 
    // IMPORTANT: Pass enabledModules directly. If it's empty, it means the tenant has no optional modules enabled.
    const allPermissions = getAllPermissions(enabledModules);
    const groups = groupPermissionsByCategory(allPermissions);

    if (!permissionSearch) return groups;

    const filteredGroups: Record<string, string[]> = {};
    Object.entries(groups).forEach(([category, perms]) => {
      const filteredPerms = perms.filter(p =>
        p.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        category.toLowerCase().includes(permissionSearch.toLowerCase())
      );
      if (filteredPerms.length > 0) {
        filteredGroups[category] = filteredPerms;
      }
    });
    return filteredGroups;
  }, [permissionSearch, enabledModules]);

  const getSelectedCount = (categoryPerms: string[]) => {
    return categoryPerms.filter(p => Array.isArray(formData.permissions) && formData.permissions.includes(p)).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = initialRole ? `/api/rbac/roles?id=${initialRole.id}` : '/api/rbac/roles';
      const method = initialRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errorData = await res.json();
        alert(`Failed to save role: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred while saving the role.');
    }
  };

  return (
    <>
      <DialogHeader className="p-6 pb-4 bg-white border-b">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-xl">{initialRole ? 'Edit Role Configuration' : 'Create New Role'}</DialogTitle>
        </div>
        <DialogDescription className="text-slate-500 ml-11">
          Configure role details and granular permissions. Changes affect all assigned users immediately.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="flex-1">
        <form id="role-form" onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border shadow-sm">
            <div className="space-y-3">
              <Label htmlFor="roleName" className="text-base font-semibold text-slate-900">Role Name</Label>
              <Input
                id="roleName"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sales Manager"
                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
              <p className="text-xs text-slate-500">A unique name to identify this role in the system.</p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="roleDesc" className="text-base font-semibold text-slate-900">Description</Label>
              <Textarea
                id="roleDesc"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the responsibilities and access level..."
                className="min-h-[100px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Access Permissions</h3>
                <p className="text-sm text-slate-500">Select the modules and actions this role can access.</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search permissions..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <Accordion type="multiple" defaultValue={Object.keys(permissionGroups)} className="w-full">
                {Object.entries(permissionGroups).map(([category, permissions]) => {
                  const selectedCount = getSelectedCount(permissions);
                  const isAllSelected = selectedCount === permissions.length;

                  return (
                    <AccordionItem key={category} value={category} className="border-b last:border-0">
                      <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                        <AccordionTrigger className="hover:no-underline py-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="capitalize font-semibold text-slate-700 text-lg">{category}</span>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                              {permissions.length} Permissions
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-4 mr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="text-sm text-slate-500 mr-2">
                            {selectedCount} / {permissions.length} selected
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "text-xs font-medium border",
                              isAllSelected ? "bg-blue-50 text-blue-600 border-blue-200" : "text-slate-600 border-slate-200 hover:bg-slate-100"
                            )}
                            onClick={() => toggleCategory(permissions, !isAllSelected)}
                          >
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                      </div>
                      <AccordionContent className="px-6 pb-6 pt-2 bg-slate-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {permissions.map(permission => {
                            const isChecked = Array.isArray(formData.permissions) && formData.permissions.includes(permission);
                            return (
                              <div
                                key={permission}
                                className={cn(
                                  "flex items-center space-x-3 p-3 rounded-lg border transition-all",
                                  isChecked ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-slate-200 hover:border-blue-300"
                                )}
                              >
                                <Checkbox
                                  id={permission}
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(permission)}
                                  className={cn("data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600")}
                                />
                                <label
                                  htmlFor={permission}
                                  className={cn(
                                    "text-sm font-medium leading-none cursor-pointer select-none flex-1",
                                    isChecked ? "text-blue-900" : "text-slate-700"
                                  )}
                                >
                                  {formatPermission(permission as any)}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
              {Object.keys(permissionGroups).length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  <Filter className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No permissions found matching "{permissionSearch}"</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </ScrollArea>

      <DialogFooter className="p-6 bg-white border-t mt-auto">
        <Button variant="outline" onClick={onCancel} className="h-11 px-6">Cancel</Button>
        <Button type="submit" form="role-form" className="h-11 px-8 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20">
          {initialRole ? 'Save Changes' : 'Create Role'}
        </Button>
      </DialogFooter>
    </>
  );
}
