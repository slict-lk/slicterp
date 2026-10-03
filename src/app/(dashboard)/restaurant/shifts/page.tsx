'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChefHat, Users, Clock, Plus, Search, Calendar, UserPlus, CreditCard, ChevronRight, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ShiftsPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Config state
    const [dailyMemo, setDailyMemo] = useState<any[]>([]);
    const [shiftRules, setShiftRules] = useState<any[]>([]);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [memoText, setMemoText] = useState('');
    const [rulesText, setRulesText] = useState('');

    // Register Staff State
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState('Waiter');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    // Shift Logs State
    const [shiftLogs, setShiftLogs] = useState<any[]>([]);
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch staff
            const staffRes = await fetch('/api/restaurant/shifts');
            if (staffRes.ok) {
                const data = await staffRes.json();
                setStaff(data);
            }

            // Fetch configs
            const configRes = await fetch('/api/restaurant/config');
            if (configRes.ok) {
                const data = await configRes.json();
                setDailyMemo(data.dailyMemo || []);
                setShiftRules(data.shiftRules || []);
            }
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to sync data");
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableUsers = async () => {
        try {
            const res = await fetch('/api/restaurant/staff?unassigned=true');
            if (res.ok) {
                const users = await res.json();
                setAvailableUsers(users);
                if (users.length > 0) setSelectedUserId(users[0].id);
            }
        } catch (error) {
            toast.error("Failed to load unassigned users");
        }
    };

    const fetchShiftLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch('/api/restaurant/shifts/history');
            if (res.ok) {
                const data = await res.json();
                setShiftLogs(data);
            }
        } catch (error) {
            toast.error("Failed to load shift logs");
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleShift = async (staffId: string, action: 'CLOCK_IN' | 'CLOCK_OUT') => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/restaurant/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId, action })
            });
            if (res.ok) {
                toast.success(action === 'CLOCK_IN' ? 'Shift Started' : 'Shift Ended');
                fetchData();
            }
        } catch (error) {
            toast.error("Failed to update shift status");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterStaff = async () => {
        if (!selectedUserId) {
            toast.error("Please select a user");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/restaurant/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUserId, role: selectedRole })
            });
            if (res.ok) {
                toast.success("Staff member registered");
                setIsRegisterOpen(false);
                fetchData();
            } else {
                toast.error("Failed to register staff");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSubmitting(true);
        try {
            const parsedMemos = memoText.split('\n').filter(line => line.trim()).map((text, i) => ({ id: i.toString(), text }));
            const parsedRules = rulesText.split('\n').filter(line => line.trim()).map((text, i) => ({ id: i.toString(), text }));

            const res = await fetch('/api/restaurant/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dailyMemo: parsedMemos, shiftRules: parsedRules })
            });
            if (res.ok) {
                toast.success("Restaurant settings updated");
                setIsConfigOpen(false);
                fetchData();
            }
        } catch (error) {
            toast.error("Failed to update settings");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openConfigModal = () => {
        setMemoText(dailyMemo.map(m => m.text).join('\n'));
        setRulesText(shiftRules.map(r => r.text).join('\n'));
        setIsConfigOpen(true);
    };

    const filteredStaff = staff.filter(s =>
        s?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s?.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Shift Management</h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-wider text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" /> Live Staff Duty Tracking
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog open={isLogsOpen} onOpenChange={(open) => {
                        setIsLogsOpen(open);
                        if (open) fetchShiftLogs();
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow font-bold text-slate-700">
                                <Calendar className="w-4 h-4 mr-2 text-slate-500" /> Shift Logs
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none rounded-[2rem] shadow-2xl">
                            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                                <div className="absolute right-[-10%] top-[-20%] w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
                                <DialogHeader className="relative z-10">
                                    <DialogTitle className="text-3xl font-black tracking-tight">Shift History Logs</DialogTitle>
                                    <DialogDescription className="text-slate-400 font-medium mt-1">
                                        Comprehensive record of all staff attendances and duty cycles.
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                                {loadingLogs ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                                        <p className="text-sm font-bold text-slate-500 animate-pulse">Fetching history...</p>
                                    </div>
                                ) : shiftLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                                            <Calendar className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <p className="text-xl font-bold text-slate-900">No Shift History</p>
                                        <p className="text-slate-500 mt-2 max-w-sm">There are no recorded shifts in the system yet. Staff need to clock in first.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {shiftLogs.map((shift) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={shift.id}
                                                className="group bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-600 font-black text-xl shadow-inner relative overflow-hidden">
                                                        {shift.staff?.user?.name?.charAt(0) || '?'}
                                                        {!shift.endTime && (
                                                            <span className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-lg text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">
                                                            {shift.staff?.user?.name || 'Unknown Staff'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                                                                {shift.staff?.role || 'Staff'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:items-end gap-2 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                                            <Clock className="w-3 h-3 text-emerald-600" />
                                                        </div>
                                                        <span className="text-slate-500 text-xs font-medium mr-1">IN:</span>
                                                        {new Date(shift.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                    {shift.endTime ? (
                                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                                                <Clock className="w-3 h-3 text-red-600" />
                                                            </div>
                                                            <span className="text-slate-500 text-xs font-medium mr-1">OUT:</span>
                                                            {new Date(shift.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end w-full">
                                                            <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50 shadow-sm shadow-emerald-500/10 px-3 py-1 animate-pulse">
                                                                Active Shift
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isRegisterOpen} onOpenChange={(open) => {
                        setIsRegisterOpen(open);
                        if (open) fetchAvailableUsers();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 font-bold transition-all hover:-translate-y-0.5">
                                <UserPlus className="w-5 h-5 mr-2" /> Register Staff
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl p-0 border-none rounded-[2rem] shadow-2xl overflow-hidden">
                            <div className="bg-emerald-500 p-8 text-white relative">
                                <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-white/20 rounded-full blur-3xl" />
                                <DialogHeader className="relative z-10">
                                    <DialogTitle className="text-3xl font-black">Register New Staff</DialogTitle>
                                    <DialogDescription className="text-emerald-100 font-medium mt-1">
                                        Select a system user and assign them a restaurant operational role.
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="p-8 space-y-8 bg-white">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-4 h-4 text-emerald-500" /> Select User
                                    </label>
                                    <select
                                        className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-slate-900 font-bold text-lg focus:border-emerald-500 focus:ring-0 transition-colors cursor-pointer outline-none"
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                    >
                                        <option value="" disabled>Choose a team member...</option>
                                        {availableUsers.map(user => (
                                            <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                        ))}
                                    </select>
                                    {availableUsers.length === 0 && (
                                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mt-2">
                                            <p className="text-sm font-bold text-orange-800">No unassigned users found.</p>
                                            <p className="text-xs text-orange-600 mt-1">All existing users are already assigned to the restaurant. Add new users in the global Settings first.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <ChefHat className="w-4 h-4 text-emerald-500" /> Assign Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Manager', 'Chef', 'Waiter', 'Cashier'].map(role => (
                                            <div
                                                key={role}
                                                onClick={() => setSelectedRole(role)}
                                                className={`p-4 border-2 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 transition-all select-none ${selectedRole === role ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-500/10 scale-[1.02]' : 'border-slate-100 hover:border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                {role === 'Chef' ? <ChefHat className={`w-8 h-8 ${selectedRole === role ? 'text-emerald-600' : 'text-slate-400'}`} /> :
                                                    role === 'Cashier' ? <CreditCard className={`w-8 h-8 ${selectedRole === role ? 'text-emerald-600' : 'text-slate-400'}`} /> :
                                                        <Users className={`w-8 h-8 ${selectedRole === role ? 'text-emerald-600' : 'text-slate-400'}`} />}
                                                <span className="font-extrabold text-sm">{role}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    className="w-full h-14 rounded-2xl text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 mt-4 transition-all active:scale-[0.98]"
                                    onClick={handleRegisterStaff}
                                    disabled={!selectedUserId || isSubmitting || availableUsers.length === 0}
                                >
                                    {isSubmitting ? 'Registering...' : 'Register as Staff'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Quick Stats Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-emerald-500 text-white border-none shadow-xl shadow-emerald-500/20 rounded-3xl overflow-hidden relative">
                    <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <CardHeader className="pb-2">
                        <CardDescription className="text-emerald-100 font-bold uppercase tracking-widest text-xs">On Duty Now</CardDescription>
                        <CardTitle className="text-4xl">{staff.filter(s => s.shifts?.length > 0).length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-emerald-100/80 text-sm font-medium">Active restaurant personnel</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200/50 shadow-sm rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Registered</CardDescription>
                        <CardTitle className="text-4xl text-slate-900">{staff.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm font-medium flex items-center gap-1">
                            <ChefHat className="w-3 h-3" /> Dedicated Team Members
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200/50 shadow-sm rounded-3xl">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-xs">Efficiency Rating</CardDescription>
                        <CardTitle className="text-4xl text-slate-900">98%</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm font-medium">BHO Attendance Score</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Staff List */}
                <Card className="lg:col-span-2 bg-white border-slate-200/50 shadow-xl rounded-[2rem] overflow-hidden border-none">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl">Staff Directory</CardTitle>
                                <CardDescription>Manage daily attendance and roles.</CardDescription>
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search name or role..."
                                    className="pl-9 rounded-xl border-slate-200 bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                <div className="p-12 space-y-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4 animate-pulse">
                                            <div className="h-14 w-14 bg-slate-100 rounded-2xl" />
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-4 bg-slate-100 rounded w-1/4" />
                                                <div className="h-4 bg-slate-100 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredStaff.length === 0 ? (
                                <div className="p-20 text-center flex flex-col items-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                        <Users className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">No staff found</h3>
                                    <p className="text-slate-500">Try adjusting your search query.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredStaff.map((member) => {
                                        const isOnDuty = member.shifts?.length > 0;
                                        return (
                                            <motion.div
                                                key={member.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className={`h-16 w-16 rounded-3xl flex items-center justify-center relative shadow-inner ${isOnDuty ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {member.role === 'Chef' ? <ChefHat className="w-8 h-8" /> :
                                                            member.role === 'Cashier' ? <CreditCard className="w-8 h-8" /> : <Users className="w-8 h-8" />}
                                                        {isOnDuty && (
                                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-lg text-slate-900 leading-tight">{member.user?.name || 'Unknown'}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="border-slate-200 text-slate-500 font-medium">
                                                                {member.role}
                                                            </Badge>
                                                            {isOnDuty && (
                                                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-tighter">
                                                                    <Clock className="w-3 h-3" /> Shift Active
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {isOnDuty ? 'Started:' : 'Status:'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                                            {isOnDuty ? new Date(member.shifts[0].startTime).toLocaleTimeString() : 'Off Duty'}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        onClick={() => toggleShift(member.id, isOnDuty ? 'CLOCK_OUT' : 'CLOCK_IN')}
                                                        disabled={isSubmitting}
                                                        className={`h-11 px-8 rounded-xl font-bold transition-all active:scale-95 ${isOnDuty
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                                                            }`}
                                                    >
                                                        {isOnDuty ? 'Clock Out' : 'Clock In'}
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>

                {/* Training / Notices */}
                <div className="space-y-8">
                    <Card className="bg-slate-900 text-white rounded-[2rem] border-none p-8 overflow-hidden relative shadow-2xl">
                        <div className="absolute right-[-20%] bottom-[-20%] w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
                        <div className="flex justify-between items-start relative z-10 mb-4">
                            <CardTitle className="text-xl">Daily Memo</CardTitle>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10" onClick={openConfigModal}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-4 relative z-10">
                            {dailyMemo.map((memo, idx) => (
                                <li key={idx} className="flex gap-3 leading-relaxed">
                                    <span className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs text-slate-900">{idx + 1}</span>
                                    <p className="text-slate-300 text-sm">{memo.text}</p>
                                </li>
                            ))}
                            {dailyMemo.length === 0 && <p className="text-slate-500 italic text-sm">No memos for today.</p>}
                        </ul>
                    </Card>

                    <Card className="bg-white border-slate-200/50 shadow-xl rounded-[2rem] border-none p-8">
                        <div className="flex justify-between items-start relative z-10 mb-2">
                            <div>
                                <CardTitle className="text-xl mb-1">Shift Rules</CardTitle>
                                <CardDescription className="mb-6">Standard operational procedures.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100" onClick={openConfigModal}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {shiftRules.map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors cursor-default">
                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-slate-900 transition-colors" />
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{rule.text}</span>
                                </div>
                            ))}
                            {shiftRules.length === 0 && <p className="text-slate-400 italic text-sm">No shift rules configured.</p>}
                        </div>
                    </Card>

                    {/* Config Edit Modal */}
                    <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Notice Board</DialogTitle>
                                <DialogDescription>Update the daily memos and shift rules for staff. Enter one rule per line.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-900">Daily Memos (One per line)</label>
                                    <textarea
                                        className="w-full h-32 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900/5 transition-all text-sm"
                                        placeholder="Enter daily updates here..."
                                        value={memoText}
                                        onChange={(e) => setMemoText(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-900">Shift Rules (One per line)</label>
                                    <textarea
                                        className="w-full h-32 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900/5 transition-all text-sm"
                                        placeholder="Enter general rules here..."
                                        value={rulesText}
                                        onChange={(e) => setRulesText(e.target.value)}
                                    />
                                </div>
                                <Button
                                    className="w-full font-bold h-11"
                                    onClick={handleSaveConfig}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
