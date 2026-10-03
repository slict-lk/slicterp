"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, HoverCard as MotionCard } from '@/components/ui/motion/primitives';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Package,
    Search,
    RefreshCw,
    Plus,
    Eye,
    MapPin,
    User,
    LayoutGrid,
    List as ListIcon,
    Filter,
    Calendar,
    Fuel,
    Gauge,
    Trash2,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Vehicle {
    id: string;
    stockNumber: string;
    chassisNumber: string;
    make: string;
    model: string;
    year: number;
    color: string | null;
    mileage: number | null;
    status: string;
    purchasePrice: number;
    location: string | null;
    customer: { id: string; name: string; country: string | null } | null;
    photos: { url: string }[];
    _count: { yardJobs: number; bids: number };
}

const STATUS_STYLES: Record<string, string> = {
    WON_AT_AUCTION: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    IN_YARD: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    READY_TO_SHIP: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    SHIPPED: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    DELIVERED: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
    CANCELLED: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
    WON_AT_AUCTION: 'Won at Auction',
    IN_YARD: 'In Yard',
    READY_TO_SHIP: 'Ready to Ship',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function InventoryPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const confirmDelete = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteId(id);
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/vehicle-export/vehicles/${deleteId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setVehicles(prev => prev.filter(v => v.id !== deleteId));
                toast.success("Vehicle Deleted", { description: "The vehicle has been successfully removed from inventory." });
                setDeleteId(null);
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            toast.error("Error", { description: "Failed to delete vehicle. Please try again." });
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchVehicles = useCallback(async () => {
        try {
            setRefreshing(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (search) params.set('search', search);

            const res = await fetch(`/api/vehicle-export/vehicles?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setVehicles(data.vehicles || []);
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchVehicles();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchVehicles]);

    return (
        <div className="p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <FadeIn className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Package className="h-8 w-8 text-blue-600" />
                        Vehicle Showroom
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        Manage your global export inventory.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={fetchVehicles}
                        disabled={refreshing}
                        className={cn("h-10", refreshing && "animate-spin")}
                    >
                        <RefreshCw className="h-5 w-5" />
                    </Button>
                    <Link href="/vehicle-export/auction/new">
                        <Button className="h-10 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Vehicle
                        </Button>
                    </Link>
                </div>
            </FadeIn>

            {/* Controls Bar */}
            <SlideUp delay={0.1} className="sticky top-4 z-10">
                <div className="p-2 sm:p-2 rounded-xl sm:rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 shadow-lg flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
                    {/* Search */}
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search stock#, chassis, model..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-10 bg-transparent border-transparent focus:bg-white dark:focus:bg-gray-800 transition-colors"
                        />
                    </div>

                    {/* Filters & View Toggle */}
                    <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        <div className="flex gap-1 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg">
                            {['all', 'WON_AT_AUCTION', 'IN_YARD'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                                        statusFilter === status
                                            ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400"
                                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    )}
                                >
                                    {status === 'all' ? 'All Vehicles' : STATUS_LABELS[status]}
                                </button>
                            ))}
                        </div>

                        <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                        <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-500")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-500")}
                            >
                                <ListIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </SlideUp>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="h-[300px] rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
                        ))}
                    </div>
                ) : vehicles.length === 0 ? (
                    <FadeIn>
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
                                <Package className="h-10 w-10 text-blue-500 opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">No vehicles found</h3>
                            <p className="text-gray-500 mt-2 max-w-md">
                                Try adjusting your search or filters, or add a new vehicle to get started.
                            </p>
                        </div>
                    </FadeIn>
                ) : (
                    <AnimatePresence mode="wait">
                        {viewMode === 'grid' ? (
                            <StaggerContainer key="grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {vehicles.map((vehicle) => (
                                    <StaggerItem key={vehicle.id}>
                                        <Link href={`/vehicle-export/inventory/${vehicle.id}`}>
                                            <MotionCard className="group h-full flex flex-col overflow-hidden bg-white/70 dark:bg-gray-900/70 border-white/20 backdrop-blur-md hover:border-blue-500/50 transition-colors">
                                                {/* Image Area */}
                                                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                                                    {vehicle.photos?.[0] ? (
                                                        <img
                                                            src={vehicle.photos[0].url}
                                                            alt={vehicle.model}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50">
                                                            <Package className="h-12 w-12 opacity-20" />
                                                        </div>
                                                    )}

                                                    {/* Status Watermark */}
                                                    {(vehicle.status === 'SOLD' || vehicle.status === 'RESERVED' || vehicle.status === 'HOLD') && (
                                                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                                            <div className={cn(
                                                                "transform -rotate-12 px-6 py-2 border-4 text-xl font-black uppercase tracking-widest opacity-90 backdrop-blur-sm shadow-xl",
                                                                vehicle.status === 'SOLD'
                                                                    ? "border-red-600/80 text-red-600 bg-red-100/80"
                                                                    : "border-orange-500/80 text-orange-500 bg-orange-100/80"
                                                            )}>
                                                                {vehicle.status}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="absolute top-3 right-3 flex gap-2">
                                                        <Badge variant="secondary" className={cn("backdrop-blur-md shadow-sm border", STATUS_STYLES[vehicle.status])}>
                                                            {STATUS_LABELS[vehicle.status] || vehicle.status}
                                                        </Badge>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                            onClick={(e) => confirmDelete(e, vehicle.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="p-5 flex-1 flex flex-col">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                                {vehicle.year} {vehicle.make} {vehicle.model}
                                                            </h3>
                                                            <p className="font-mono text-xs text-gray-500 mt-1">{vehicle.stockNumber}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 dark:text-gray-400 my-4">
                                                        <div className="flex items-center gap-2">
                                                            <Gauge className="h-4 w-4 opacity-70" />
                                                            {vehicle.mileage?.toLocaleString() || '-'} km
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Fuel className="h-4 w-4 opacity-70" />
                                                            {vehicle.color || 'N/A'}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 opacity-70" />
                                                            {vehicle.location || 'In Transit'}
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                                                <User className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-sm font-medium truncate max-w-[100px]" title={vehicle.customer?.name}>
                                                                {vehicle.customer?.name || 'Stock'}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            {formatCurrency(vehicle.purchasePrice)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </MotionCard>
                                        </Link>
                                    </StaggerItem>
                                ))}
                            </StaggerContainer>
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="rounded-2xl border border-white/20 overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg"
                            >
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                            <TableRow>
                                                <TableHead>Stock #</TableHead>
                                                <TableHead>Vehicle</TableHead>
                                                <TableHead>Details</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {vehicles.map((vehicle, i) => (
                                                <TableRow key={vehicle.id} className="group hover:bg-blue-50/10 dark:hover:bg-blue-900/10 transition-colors">
                                                    <TableCell className="font-mono font-medium text-gray-600">{vehicle.stockNumber}</TableCell>
                                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                                        {vehicle.year} {vehicle.make} {vehicle.model}
                                                    </TableCell>
                                                    <TableCell className="text-gray-500 text-sm">
                                                        {vehicle.color} • {vehicle.mileage?.toLocaleString()} km
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3 w-3 text-gray-400" />
                                                            {vehicle.customer?.name || <span className="text-gray-300 italic">Stock</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(vehicle.purchasePrice)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn("font-normal", STATUS_STYLES[vehicle.status])}>
                                                            {STATUS_LABELS[vehicle.status] || vehicle.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/vehicle-export/inventory/${vehicle.id}`}>
                                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    View
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700 hover:bg-red-50"
                                                                onClick={(e) => confirmDelete(e, vehicle.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Vehicle</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this vehicle? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
