"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModuleCopilotPanel } from '@/components/ai/module-copilot-panel';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, HoverCard as MotionCard } from '@/components/ui/motion/primitives';
import {
    Ship,
    Gavel,
    Users,
    Package,
    ClipboardCheck,
    Truck,
    AlertTriangle,
    RefreshCw,
    Plus,
    ArrowRight,
    Clock,
    CheckCircle,
    CircleDot,
    TrendingUp,
    Anchor,
    MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// --- Types ---
interface DashboardStats {
    pendingBids: number;
    approvedBids: number;
    inYard: number;
    readyToShip: number;
    shipped: number;
    delivered: number;
    pendingYardJobs: number;
    totalVehicles: number;
}

interface RecentVehicle {
    id: string;
    stockNumber: string;
    make: string;
    model: string;
    status: string;
    updatedAt: string;
}

// --- Constants ---
const STATUS_COLORS: Record<string, string> = {
    WON_AT_AUCTION: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/20',
    IN_YARD: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
    READY_TO_SHIP: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    SHIPPED: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20',
    DELIVERED: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const STATUS_LABELS: Record<string, string> = {
    WON_AT_AUCTION: 'Won at Auction',
    IN_YARD: 'In Yard',
    READY_TO_SHIP: 'Ready to Ship',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
};

// --- Page Component ---
export default function VehicleExportPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentVehicles, setRecentVehicles] = useState<RecentVehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/vehicle-export/dashboard');
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setRecentVehicles(data.recentVehicles || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <FadeIn className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <span className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 text-white">
                            <Ship className="h-6 w-6" />
                        </span>
                        Export Command Center
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Real-time overview of your global logistics operations.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={refreshing}
                        className="h-11 border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Sync Data
                    </Button>
                    <Link href="/vehicle-export/auction/new" className="w-full sm:w-auto">
                        <Button className="h-11 w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]">
                            <Plus className="mr-2 h-4 w-4" />
                            New Auction Win
                        </Button>
                    </Link>
                </div>
            </FadeIn>

            {/* Pipeline Glass Strip */}
            <SlideUp delay={0.1}>
                <div className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl shadow-sm p-6 sm:p-8">
                    <div className="flex flex-wrap gap-4 md:gap-8 items-center justify-center sm:justify-between">
                        <PipelineNode label="Pending Bids" count={stats?.pendingBids ?? 0} icon={Clock} color="text-yellow-600" active />
                        <PipelineArrow />
                        <PipelineNode label="In Yard" count={stats?.inYard ?? 0} icon={Package} color="text-blue-600" active />
                        <PipelineArrow />
                        <PipelineNode label="Ready to Ship" count={stats?.readyToShip ?? 0} icon={CheckCircle} color="text-emerald-600" active />
                        <PipelineArrow />
                        <PipelineNode label="Shipped" count={stats?.shipped ?? 0} icon={Anchor} color="text-purple-600" active />
                        <PipelineArrow />
                        <PipelineNode label="Delivered" count={stats?.delivered ?? 0} icon={MapPin} color="text-indigo-600" active />
                    </div>
                </div>
            </SlideUp>

            {/* Stats Grid */}
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StaggerItem>
                    <GlassStatCard
                        title="Action Required"
                        value={stats?.pendingBids ?? 0}
                        subtitle="Pending Bids"
                        icon={Gavel}
                        trend="High Priority"
                        color="orange"
                    />
                </StaggerItem>
                <StaggerItem>
                    <GlassStatCard
                        title="Yard Inventory"
                        value={stats?.inYard ?? 0}
                        subtitle="Vehicles in Stock"
                        icon={Package}
                        trend="+2 this week"
                        color="blue"
                    />
                </StaggerItem>
                <StaggerItem>
                    <GlassStatCard
                        title="Logistics"
                        value={stats?.readyToShip ?? 0}
                        subtitle="Ready for Booking"
                        icon={Ship}
                        trend="Waiting"
                        color="emerald"
                    />
                </StaggerItem>
                <StaggerItem>
                    <GlassStatCard
                        title="Total Value"
                        value={stats?.totalVehicles ?? 0}
                        subtitle="Active Vehicles"
                        icon={TrendingUp}
                        trend="Global Fleet"
                        color="indigo"
                    />
                </StaggerItem>
            </StaggerContainer>

            <ModuleCopilotPanel
                module="vehicle-export"
                title="Vehicle Export Copilot"
                description="Surface shipment delay risk, yard bottlenecks, and customer-impacting exceptions."
                context={{
                    pendingBids: stats?.pendingBids || 0,
                    inYard: stats?.inYard || 0,
                    readyToShip: stats?.readyToShip || 0,
                    shipped: stats?.shipped || 0,
                    pendingYardJobs: stats?.pendingYardJobs || 0,
                    recentVehicles: recentVehicles.length,
                }}
                suggestions={[
                    'Summarize shipment and customs risk.',
                    'Which vehicles need operator action next?',
                ]}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Available Actions (Left Column) */}
                <div className="lg:col-span-2 space-y-8">
                    <SlideUp delay={0.2}>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <CircleDot className="h-5 w-5 text-blue-500" />
                            Quick Access
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                            <ActionTile href="/vehicle-export/bids" label="Manage Bids" icon={Users} color="bg-yellow-500" delay={0} />
                            <ActionTile href="/vehicle-export/auction/new" label="Auction Entry" icon={Gavel} color="bg-orange-500" delay={0.05} />
                            <ActionTile href="/vehicle-export/inventory" label="Inventory" icon={Package} color="bg-blue-500" delay={0.1} />
                            <ActionTile href="/vehicle-export/yard" label="Yard Jobs" icon={ClipboardCheck} color="bg-emerald-500" delay={0.15} />
                            <ActionTile href="/vehicle-export/shipments" label="Shipments" icon={Ship} color="bg-purple-500" delay={0.2} />
                            <ActionTile href="/vehicle-export/finance" label="Finance" icon={TrendingUp} color="bg-pink-500" delay={0.25} />
                        </div>
                    </SlideUp>

                    <SlideUp delay={0.3}>
                        <div className="mt-8 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                                    <p className="text-sm text-gray-500">Latest updates across your fleet</p>
                                </div>
                                <Link href="/vehicle-export/inventory">
                                    <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600">
                                        View All
                                        <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>

                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-500">Loading activity...</div>
                                ) : recentVehicles.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>No recent activity found</p>
                                    </div>
                                ) : (
                                    recentVehicles.map((vehicle, i) => (
                                        <motion.div
                                            key={vehicle.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * i }}
                                        >
                                            <Link href={`/vehicle-export/inventory/${vehicle.id}`}>
                                                <div className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-between group cursor-pointer">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                                                                {vehicle.stockNumber}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {vehicle.make} {vehicle.model}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className={cn("px-3 py-1", STATUS_COLORS[vehicle.status])}>
                                                        {STATUS_LABELS[vehicle.status] || vehicle.status}
                                                    </Badge>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </SlideUp>
                </div>

                {/* Right Column: Alerts */}
                <div className="space-y-6">
                    <SlideUp delay={0.4}>
                        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Priority Alerts
                            </h3>
                            <div className="space-y-3">
                                {stats && stats.pendingBids > 0 && (
                                    <AlertCard
                                        type="warning"
                                        title={`${stats.pendingBids} Pending Bids`}
                                        desc="Review and approve customer bids"
                                        href="/vehicle-export/bids?status=PENDING"
                                    />
                                )}
                                {stats && stats.pendingYardJobs > 0 && (
                                    <AlertCard
                                        type="info"
                                        title={`${stats.pendingYardJobs} Yard Jobs`}
                                        desc="Vehicles requiring service"
                                        href="/vehicle-export/yard"
                                    />
                                )}
                                {(!stats || (stats.pendingBids === 0 && stats.pendingYardJobs === 0)) && (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                                        All caught up! No priority alerts.
                                    </div>
                                )}
                            </div>
                        </div>
                    </SlideUp>
                </div>
            </div>
        </div>
    );
}

// --- Components ---

function GlassStatCard({ title, value, subtitle, icon: Icon, trend, color }: any) {
    const colors = {
        orange: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
        blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
        emerald: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
        indigo: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
    };

    return (
        <MotionCard className="relative overflow-hidden p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-white/20 shadow-xl">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</h3>
                </div>
                <div className={cn("p-3 rounded-xl", colors[color as keyof typeof colors])}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {subtitle}
                </span>
            </div>
        </MotionCard>
    );
}

function ActionTile({ label, icon: Icon, color, href, delay }: any) {
    return (
        <Link href={href} className="block">
            <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay }}
                className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 border border-white/20 shadow-lg hover:shadow-xl hover:border-blue-500/30 transition-all cursor-pointer h-32"
            >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-white shadow-lg transition-transform group-hover:scale-110", color)}>
                    <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors">
                    {label}
                </span>
            </motion.div>
        </Link>
    );
}

function PipelineNode({ label, count, icon: Icon, color, active }: any) {
    return (
        <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <div className={cn("relative h-12 w-12 rounded-full border-2 flex items-center justify-center bg-white dark:bg-gray-800 z-10",
                active ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400" : "border-gray-200 text-gray-400")}>
                <Icon className="h-5 w-5" />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-md">
                        {count}
                    </span>
                )}
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">{label}</span>
        </div>
    );
}

function PipelineArrow() {
    return (
        <div className="hidden sm:block flex-1 h-[2px] bg-gray-200 dark:bg-gray-700 mx-2" />
    );
}

function AlertCard({ type, title, desc, href }: any) {
    const styles = {
        warning: "bg-orange-50/50 border-orange-200/50 hover:bg-orange-50",
        info: "bg-blue-50/50 border-blue-200/50 hover:bg-blue-50",
        success: "bg-green-50/50 border-green-200/50 hover:bg-green-50",
    };

    return (
        <Link href={href}>
            <div className={cn("p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between group", styles[type as keyof typeof styles])}>
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
                    <p className="text-sm text-gray-500">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
        </Link>
    );
}
