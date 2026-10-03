"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Ship, RefreshCw, Plus, Package, Anchor, Truck, CheckCircle, Loader2,
    MapPin, Calendar, ArrowRight, ExternalLink, MoreVertical, Search, Box
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '@/components/ui/motion/primitives';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Vehicle {
    id: string;
    stockNumber: string;
    make: string;
    model: string;
    status: string;
}

interface Shipment {
    id: string;
    shipmentNumber: string;
    vesselName: string | null;
    voyageNumber: string | null;
    shippingLine: string | null;
    departurePort: string;
    destinationPort: string;
    etd: string | null;
    eta: string | null;
    status: 'BOOKED' | 'LOADING' | 'SHIPPED' | 'DELIVERED';
    vehicles: Vehicle[];
    _count: { vehicles: number };
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: any; progress: number }> = {
    BOOKED: { color: 'bg-yellow-500', label: 'Booked', icon: Anchor, progress: 25 },
    LOADING: { color: 'bg-blue-500', label: 'Loading', icon: Box, progress: 50 },
    SHIPPED: { color: 'bg-purple-500', label: 'On Water', icon: Ship, progress: 75 },
    DELIVERED: { color: 'bg-green-500', label: 'Delivered', icon: CheckCircle, progress: 100 },
};

const PORTS = {
    departure: ['Yokohama', 'Nagoya', 'Kobe', 'Osaka', 'Hakata', 'Kawasaki'],
    destination: ['Colombo', 'Gaborone', 'Durban', 'Mombasa', 'Dar es Salaam', 'Lagos', 'Tema'],
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'TBD';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
    }).format(new Date(dateStr));
}

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [readyVehicles, setReadyVehicles] = useState<Vehicle[]>([]);
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    
    const [newShipment, setNewShipment] = useState({
        vesselName: '',
        voyageNumber: '',
        shippingLine: '',
        departurePort: 'Yokohama',
        destinationPort: 'Colombo',
        etd: '',
        eta: '',
    });

    const fetchShipments = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/vehicle-export/shipments');
            if (res.ok) {
                const data = await res.json();
                setShipments(data.shipments || []);
            }
        } catch (error) {
            console.error('Error fetching shipments:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchReadyVehicles = useCallback(async () => {
        try {
            const res = await fetch('/api/vehicle-export/vehicles?status=READY_TO_SHIP');
            if (res.ok) {
                const data = await res.json();
                setReadyVehicles(data.vehicles || []);
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    }, []);

    useEffect(() => {
        fetchShipments();
        fetchReadyVehicles();
    }, [fetchShipments, fetchReadyVehicles]);

    const handleCreate = async () => {
        if (!newShipment.departurePort || !newShipment.destinationPort) {
            toast.error('Error', { description: 'Please select ports' });
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/vehicle-export/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newShipment),
            });

            if (res.ok) {
                toast.success('Shipment Created', { description: 'New shipment has been created' });
                setShowCreateDialog(false);
                setNewShipment({
                    vesselName: '',
                    voyageNumber: '',
                    shippingLine: '',
                    departurePort: 'Yokohama',
                    destinationPort: 'Colombo',
                    etd: '',
                    eta: '',
                });
                fetchShipments();
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to create shipment' });
        } finally {
            setCreating(false);
        }
    };

    const updateStatus = async (shipmentId: string, action: 'ship' | 'deliver') => {
        try {
            const res = await fetch('/api/vehicle-export/shipments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentId, action }),
            });

            if (res.ok) {
                toast.error(action === 'ship' ? 'Marked as Shipped' : 'Marked as Delivered');
                fetchShipments();
                setSelectedShipment(null);
            }
        } catch (error) {
            toast.success('Error');
        }
    };

    const filteredShipments = shipments.filter(s =>
        viewMode === 'active' ? s.status !== 'DELIVERED' : s.status === 'DELIVERED'
    );

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black p-4 sm:p-8 space-y-8">

            {/* Header & Stats */}
            <div className="space-y-6">
                <FadeIn className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Ship className="h-8 w-8 text-indigo-500" />
                            Logistics Hub
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage global freight and vessel schedules</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 mr-2">
                            <Button
                                variant={viewMode === 'active' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('active')}
                                className="text-xs"
                            >
                                Active
                            </Button>
                            <Button
                                variant={viewMode === 'history' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('history')}
                                className="text-xs"
                            >
                                History
                            </Button>
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchShipments} disabled={refreshing}>
                            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        </Button>
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="mr-2 h-4 w-4" /> New Booking
                        </Button>
                    </div>
                </FadeIn>

                {/* Animated Stats Cards */}
                <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Booking Queue', value: readyVehicles.length, icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/10' },
                        { label: 'Active Voyages', value: shipments.filter(s => s.status !== 'DELIVERED').length, icon: Ship, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                        { label: 'Avg Transit', value: '24 Days', icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/10' },
                        { label: 'Delivered (M)', value: shipments.filter(s => s.status === 'DELIVERED').length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
                    ].map((stat, i) => (
                        <StaggerItem key={i}>
                            <Card className="border-none shadow-sm bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                                    </div>
                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stat.bg)}>
                                        <stat.icon className={cn("h-5 w-5", stat.color)} />
                                    </div>
                                </CardContent>
                            </Card>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </div>

            {/* Mobile View Toggle */}
            <div className="md:hidden">
                <Tabs defaultValue="active" onValueChange={(v: any) => setViewMode(v)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="active">Active Shipments</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Shipments List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : filteredShipments.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Ship className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">No shipments found</p>
                    </div>
                ) : (
                    <StaggerContainer>
                        {filteredShipments.map((shipment) => {
                            const status = STATUS_CONFIG[shipment.status];
                            return (
                                <StaggerItem key={shipment.id}>
                                    <motion.div
                                        whileHover={{ scale: 1.005 }}
                                        onClick={() => setSelectedShipment(shipment)}
                                        className="group cursor-pointer relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-md"
                                    >
                                        {/* Status Progress Bar */}
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800">
                                            <div
                                                className={cn("h-full transition-all duration-500", status.color)}
                                                style={{ width: `${status.progress}%` }}
                                            />
                                        </div>

                                        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">

                                            {/* Shipment Info */}
                                            <div className="flex items-center gap-4">
                                                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors")}>
                                                    <status.icon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                                        {shipment.shipmentNumber}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                                        {shipment.shippingLine || 'Unknown Line'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Route Visualization */}
                                            <div className="md:col-span-2 flex items-center justify-between gap-4 px-4">
                                                <div className="text-right flex-1">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{shipment.departurePort}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(shipment.etd)}</p>
                                                </div>

                                                <div className="flex-1 flex flex-col items-center">
                                                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700 relative">
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 dark:bg-gray-900 px-2">
                                                            <Ship className="h-4 w-4 text-gray-400" />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs font-mono text-gray-400 mt-2">{shipment.vesselName || 'TBD'}</p>
                                                </div>

                                                <div className="text-left flex-1">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{shipment.destinationPort}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(shipment.eta)}</p>
                                                </div>
                                            </div>

                                            {/* Badges & Actions */}
                                            <div className="flex items-center justify-between md:justify-end gap-3">
                                                <Badge variant="outline" className="h-8 px-3 flex items-center gap-2">
                                                    <Package className="h-3 w-3" /> {shipment._count.vehicles}
                                                </Badge>
                                                <Badge className={cn("h-8 px-3", status.color.replace('bg-', 'bg-opacity-10 text-').replace('500', '600 dark:text-white'))}>
                                                    {status.label}
                                                </Badge>
                                            </div>
                                        </div>
                                    </motion.div>
                                </StaggerItem>
                            );
                        })}
                    </StaggerContainer>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-xl bg-white dark:bg-gray-950">
                    <DialogHeader>
                        <DialogTitle>Schedule New Shipment</DialogTitle>
                        <DialogDescription>Enter vessel details and route information.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-4">
                        <div className="col-span-2">
                            <Label>Shipping Line & Vessel</Label>
                            <div className="grid grid-cols-2 gap-4 mt-1.5">
                                <Input
                                    placeholder="Line (e.g. NYK)"
                                    value={newShipment.shippingLine}
                                    onChange={e => setNewShipment({ ...newShipment, shippingLine: e.target.value })}
                                />
                                <Input
                                    placeholder="Vessel Name"
                                    value={newShipment.vesselName}
                                    onChange={e => setNewShipment({ ...newShipment, vesselName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Departure Port</Label>
                            <Select
                                value={newShipment.departurePort}
                                onValueChange={v => setNewShipment({ ...newShipment, departurePort: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PORTS.departure.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Destination Port</Label>
                            <Select
                                value={newShipment.destinationPort}
                                onValueChange={v => setNewShipment({ ...newShipment, destinationPort: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PORTS.destination.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>ETD</Label>
                            <Input type="date" value={newShipment.etd} onChange={e => setNewShipment({ ...newShipment, etd: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>ETA</Label>
                            <Input type="date" value={newShipment.eta} onChange={e => setNewShipment({ ...newShipment, eta: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating} className="bg-indigo-600 text-white">
                            {creating ? <Loader2 className="animate-spin" /> : 'Create Schedule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View/Edit Shipment Dialog */}
            <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
                <DialogContent className="max-w-2xl bg-white dark:bg-gray-950">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-2xl">{selectedShipment?.shipmentNumber}</DialogTitle>
                            {selectedShipment && (
                                <Badge className={cn(STATUS_CONFIG[selectedShipment.status].color)}>
                                    {selectedShipment.status}
                                </Badge>
                            )}
                        </div>
                        <DialogDescription className="flex items-center gap-2">
                            {selectedShipment?.vesselName || 'Unassigned Vessel'} • {selectedShipment?.shippingLine || 'No Line'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedShipment && (
                        <div className="space-y-8">
                            {/* Visual Route */}
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Origin</p>
                                    <p className="font-bold text-lg mt-1">{selectedShipment.departurePort}</p>
                                    <p className="text-sm text-gray-500">{formatDate(selectedShipment.etd)}</p>
                                </div>
                                <div className="flex-1 px-8 flex flex-col items-center opacity-50">
                                    <ArrowRight className="h-6 w-6 text-gray-400" />
                                    <p className="text-xs mt-1">~24 Days</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Destination</p>
                                    <p className="font-bold text-lg mt-1">{selectedShipment.destinationPort}</p>
                                    <p className="text-sm text-gray-500">{formatDate(selectedShipment.eta)}</p>
                                </div>
                            </div>

                            {/* Manifest */}
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Package className="h-4 w-4" /> Cargo Manifest ({selectedShipment.vehicles.length})
                                </h3>
                                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {selectedShipment.vehicles.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-400">No vehicles assigned yet</div>
                                    ) : selectedShipment.vehicles.map((v, i) => (
                                        <div key={v.id} className="flex items-center justify-between p-3 border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-gray-400 w-6 text-right">{i + 1}</span>
                                                <span className="font-medium">{v.stockNumber}</span>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{v.make} {v.model}</span>
                                            </div>
                                            <ExternalLink className="h-3 w-3 text-gray-300" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                {selectedShipment.status === 'BOOKED' && (
                                    <Button onClick={() => updateStatus(selectedShipment.id, 'ship')} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Confirm Departure
                                    </Button>
                                )}
                                {selectedShipment.status === 'SHIPPED' && (
                                    <Button onClick={() => updateStatus(selectedShipment.id, 'deliver')} className="bg-green-600 hover:bg-green-700 text-white">
                                        Confirm Arrival
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
