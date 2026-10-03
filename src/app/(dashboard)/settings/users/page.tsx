'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { UserForm } from '@/components/settings/UserForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Users, Shield, ShieldCheck, Mail, Building, Calendar, MoreVertical, Edit, Trash2, Filter, RefreshCw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  roleId?: string;
  permissions?: any;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Stats
  const activeCount = users.filter(u => u.isActive).length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;

  const fetchUsers = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/settings/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (data: any) => {
    try {
      const response = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      await fetchUsers();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (data: any) => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(`/api/settings/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      await fetchUsers();
      setDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`/api/settings/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      await fetchUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Team Members</h1>
          <p className="text-slate-300 text-lg">Manage accounts, roles, and access permissions.</p>
          <div className="flex gap-4 mt-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {users.length} Total</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> {adminCount} Admins</span>
            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500" /> {activeCount} Active</span>
          </div>
        </div>

        <div className="flex gap-4 relative z-10">
          <Button variant="outline" onClick={fetchUsers} disabled={refreshing} className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedUser(null)} className="bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-500/30">
                <Plus className="mr-2 h-4 w-4" /> Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50">
              <DialogHeader className="p-6 pb-4 bg-white border-b">
                <DialogTitle>{selectedUser ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
                <DialogDescription>
                  {selectedUser ? 'Update user details and permissions.' : 'Create a new user account and assign roles.'}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 p-6">
                <UserForm
                  initialData={selectedUser || undefined}
                  onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
                  onCancel={() => setDialogOpen(false)}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Background Pattern */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="py-24 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading team members...</p>
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-slate-900">No users found</h3>
          <p>Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map(user => (
            <Card key={user.id} className="group hover:shadow-xl transition-all duration-300 border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm",
                      user.role === 'ADMIN' ? "bg-red-100 text-red-600" :
                        user.role === 'MANAGER' ? "bg-blue-100 text-blue-600" :
                          "bg-slate-100 text-slate-600"
                    )}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{user.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Mail className="h-3 w-3" /> {user.email}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedUser(user); setDialogOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                    <span className="text-slate-500">Role</span>
                    <Badge variant="secondary" className={cn(
                      "capitalize",
                      user.role === 'ADMIN' ? "bg-red-50 text-red-700 hover:bg-red-100" :
                        user.role === 'MANAGER' ? "bg-blue-50 text-blue-700 hover:bg-blue-100" :
                          "bg-slate-100 text-slate-700"
                    )}>
                      {user.role?.toLowerCase() || 'User'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                    <span className="text-slate-500">Department</span>
                    <span className="font-medium text-slate-900">{user.department || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                    <span className="text-slate-500">Status</span>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm py-2 border-t border-slate-100">
                    <span className="text-slate-500">Last Login</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
