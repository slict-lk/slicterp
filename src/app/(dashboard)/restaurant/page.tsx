"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModuleCopilotPanel } from '@/components/ai/module-copilot-panel';
import { ChefHat, CreditCard, LayoutGrid, Settings, UtensilsCrossed, Users, TrendingUp, ShoppingBag, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function RestaurantDashboard() {
    const [stats, setStats] = useState({
        activeTickets: 0,
        dailySales: 0,
        completedOrders: 0,
        capacityPercentage: 0,
        recentTickets: [] as any[]
    });
    const [loading, setLoading] = useState(true);

    // Staff & Shift States
    const [staff, setStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(true);
    const [isShiftLoading, setIsShiftLoading] = useState(false);

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/restaurant/shifts');
            if (res.ok) {
                const data = await res.json();
                setStaff(data);
            }
        } catch (error) {
            console.error("Failed to load staff", error);
        } finally {
            setLoadingStaff(false);
        }
    };

    const toggleShift = async (staffId: string, action: 'CLOCK_IN' | 'CLOCK_OUT') => {
        setIsShiftLoading(true);
        try {
            const res = await fetch('/api/restaurant/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ staffId, action })
            });
            if (res.ok) {
                toast.success(action === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out');
                fetchStaff();
            }
        } catch (error) {
            toast.error("Failed to update shift");
        } finally {
            setIsShiftLoading(false);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/restaurant/dashboard/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to load stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        fetchStaff();
        // Poll every 30s
        const interval = setInterval(() => {
            fetchStats();
            fetchStaff();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const coreModules = [
        {
            title: 'Point of Sale (POS)',
            description: 'Take orders for Dine-in, Takeaway, and Delivery.',
            icon: CreditCard,
            href: '/restaurant/pos',
            color: 'from-blue-500 to-blue-700',
            bg: 'bg-blue-500/10 text-blue-400'
        },
        {
            title: 'Kitchen Display (KDS)',
            description: 'Real-time order tickets for the kitchen team.',
            icon: ChefHat,
            href: '/restaurant/kitchen',
            color: 'from-orange-500 to-orange-700',
            bg: 'bg-orange-500/10 text-orange-400'
        },
        {
            title: 'Floor Plan',
            description: 'Manage table layout and zones (A/C, Outdoor).',
            icon: LayoutGrid,
            href: '/restaurant/floor-plan',
            color: 'from-indigo-500 to-indigo-700',
            bg: 'bg-indigo-500/10 text-indigo-400'
        },
        {
            title: 'Menu & Settings',
            description: 'Configure menu items, taxes, and preferences.',
            icon: Settings,
            href: '/restaurant/setup',
            color: 'from-emerald-500 to-emerald-700',
            bg: 'bg-emerald-500/10 text-emerald-400'
        },
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(amount);
    };

    const getElapsedTime = (start: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(start).getTime()) / 60000);
        return diff + 'm';
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight">
                        Restaurant Operations
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage your front and back of house seamlessly.</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Live Services Active</span>
                </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10 relative z-10">
                <StatCard
                    title="Active Tickets"
                    value={loading ? "..." : stats.activeTickets.toString()}
                    icon={ShoppingBag}
                    color="text-orange-500"
                    bg="bg-orange-500/10"
                    delay={0.1}
                />
                <StatCard
                    title="Daily Sales"
                    value={loading ? "..." : formatCurrency(stats.dailySales)}
                    icon={TrendingUp}
                    color="text-blue-500"
                    bg="bg-blue-500/10"
                    delay={0.2}
                />
                <StatCard
                    title="Completed Orders"
                    value={loading ? "..." : stats.completedOrders.toString()}
                    icon={CheckCircle2}
                    color="text-emerald-500"
                    bg="bg-emerald-500/10"
                    delay={0.3}
                />
                <StatCard
                    title="Total Guests"
                    value={loading ? "..." : `Capacity ${stats.capacityPercentage || 0}%`}
                    icon={Users}
                    color="text-indigo-500"
                    bg="bg-indigo-500/10"
                    delay={0.4}
                    subtext="Estimated Dine-in"
                />
            </div>

            <div className="mb-10 relative z-10">
                <ModuleCopilotPanel
                    module="restaurant"
                    title="Restaurant Copilot"
                    description="Summarize service pressure, staffing balance, and kitchen execution risk."
                    context={{
                        activeTickets: stats.activeTickets,
                        dailySales: stats.dailySales,
                        completedOrders: stats.completedOrders,
                        capacityPercentage: stats.capacityPercentage,
                        staffOnDuty: staff.filter((member) => member.shifts?.length > 0).length,
                    }}
                    suggestions={[
                        'Give me a shift briefing for current service.',
                        'Where is operational pressure building right now?',
                    ]}
                />
            </div>

            {/* Main Modules Grid */}
            <div className="mb-10 relative z-10">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <UtensilsCrossed className="h-6 w-6 text-slate-400" />
                    Core Modules
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {coreModules.map((module, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={i}
                        >
                            <Link href={module.href} className="group block h-full">
                                <Card className="h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden relative">
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.color}`}></div>
                                    <CardHeader className="p-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${module.bg} group-hover:scale-110 transition-transform duration-300`}>
                                            <module.icon className="h-7 w-7" />
                                        </div>
                                        <CardTitle className="text-xl group-hover:text-slate-900 dark:group-hover:text-white text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between font-bold">
                                            {module.title}
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="pt-2 text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                            {module.description}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

                {/* Kitchen Status Board */}
                <Card className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ChefHat className="w-40 h-40" />
                    </div>
                    <CardHeader className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50">
                        <CardTitle className="text-xl flex items-center gap-2">
                            Live Kitchen Pulse
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-0 ml-2 animate-pulse">Live</Badge>
                        </CardTitle>
                        <CardDescription>Recently sent orders currently in preparation.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />)}
                            </div>
                        ) : stats.recentTickets.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 font-medium">No active kitchen orders.</div>
                        ) : (
                            <div className="space-y-4">
                                {stats.recentTickets.map((ticket, i) => (
                                    <div key={ticket.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center font-bold text-lg border border-orange-200 dark:border-orange-800/50 shadow-inner">
                                                #{ticket.orderNumber.split('-').pop()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                                                    {ticket.status === 'READY_TO_SERVE' ? 'Ready to Serve' :
                                                        ticket.status === 'PREPARING' ? 'Kitchen Preparing' : 'Pending Preparation'}
                                                </h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3" /> {ticket.status === 'READY_TO_SERVE' ? 'Ready' : `Waiting: ${getElapsedTime(ticket.createdAt)}`} • {ticket.items?.length || 0} items
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Staff Actions */}
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-lg">
                    <CardHeader className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50">
                        <CardTitle className="text-xl">Shift Manager</CardTitle>
                        <CardDescription>Staff currently on duty.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {loadingStaff ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-14 bg-slate-100 rounded-xl" />
                                <div className="h-14 bg-slate-100 rounded-xl" />
                            </div>
                        ) : staff.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">No staff registered for restaurant yet.</div>
                        ) : (
                            staff.map((member: any) => {
                                const isOnDuty = member.shifts?.length > 0;
                                return (
                                    <div key={member.id} className={`p-4 rounded-xl text-sm font-bold flex justify-between items-center border shadow-sm transition-all ${isOnDuty ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                        <span className="flex items-center gap-2">
                                            {member.role === 'Chef' ? <ChefHat className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                            {member.user.name} ({member.role})
                                        </span>
                                        <button
                                            onClick={() => toggleShift(member.id, isOnDuty ? 'CLOCK_OUT' : 'CLOCK_IN')}
                                            disabled={isShiftLoading}
                                            className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-300'} transition-all hover:scale-125`}
                                            title={isOnDuty ? 'Clock Out' : 'Clock In'}
                                        />
                                    </div>
                                );
                            })
                        )}
                        <Link href="/restaurant/shifts" className="block w-full">
                            <Button className="w-full mt-6 h-12 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
                                Manage All Staff
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Reusable animated stat card
function StatCard({ title, value, icon: Icon, color, bg, delay, subtext }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay }}
        >
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${bg} opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
                <CardContent className="p-6 relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">{title}</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">{value}</h3>
                        {subtext && <p className="text-xs font-medium text-slate-400 mt-1">{subtext}</p>}
                    </div>
                    <div className={`p-4 rounded-2xl ${bg} backdrop-blur-sm border border-white/10 shadow-inner`}>
                        <Icon className={`h-7 w-7 ${color}`} />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
