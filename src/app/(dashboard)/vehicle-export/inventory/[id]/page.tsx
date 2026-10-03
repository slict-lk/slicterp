"use client";

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, HoverCard as MotionCard } from '@/components/ui/motion/primitives';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Package,
    User,
    MapPin,
    Gavel,
    Ship,
    ClipboardCheck,
    Camera,
    CheckCircle,
    XCircle,
    Clock,
    Info,
    DollarSign,
    Fuel,
    Gauge,
    Anchor,
    Upload,
    Download,
    Loader2
} from 'lucide-react';
import JSZip from 'jszip';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { PenSquare } from "lucide-react";

// --- Types ---

interface Vehicle {
    id: string;
    stockNumber: string;
    chassisNumber: string;
    make: string;
    model: string;
    year: number;
    month: number | null;
    engineCode: string | null;
    engineCc: number | null;
    fuelType: string | null;
    color: string | null;
    transmission: string | null;
    mileage: number | null;
    location: string | null;
    purchasePrice: number;
    fobPrice: number | null;
    cifPrice: number | null;
    taxAmount: number | null;
    dutyAmount: number | null;
    shippingCost: number | null;
    auctionHouse: string | null;
    auctionGrade: string | null;
    lotNumber: string | null;
    status: string;
    shakenStatus: string;
    mashoStatus: string;
    jaaiStatus: string;
    isPublished: boolean;
    customer: { id: string; name: string; email: string; country: string | null } | null;
    shipment: { id: string; shipmentNumber: string; vesselName: string | null; status: string } | null;
    photos: { id: string; url: string; tag: string | null }[];
    yardJobs: YardJob[];
    bids: { id: string; status: string; maxBudget: number | null; customer: { name: string } }[];
    documents: { id: string; status: string; courierName: string | null; trackingNumber: string | null; dispatchedAt: string | null } | null;
    invoice: { id: string; invoiceNumber: string; totalAmount: number; status: string } | null;
}

interface YardJob {
    id: string;
    title: string;
    type: string;
    status: string;
    notes: string | null;
    assignedTo: string | null;
    completedAt: string | null;
    proofPhotos: string[];
    createdAt: string;
}

// --- Constants ---

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    WON_AT_AUCTION: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800', label: 'Won at Auction' },
    IN_YARD: { color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800', label: 'In Yard' },
    READY_TO_SHIP: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800', label: 'Ready to Ship' },
    SHIPPED: { color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800', label: 'Shipped' },
    DELIVERED: { color: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800', label: 'Delivered' },
    SOLD: { color: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800', label: 'Sold' },
    RESERVED: { color: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800', label: 'Reserved' },
};

function formatCurrency(amount: number | null, currency: string = 'JPY'): string {
    if (amount === null) return '—';
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount);
}

// --- Main Page ---

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [generatingInvoice, setGeneratingInvoice] = useState(false);
    const [availableShipments, setAvailableShipments] = useState([]);
    const [assigningShipment, setAssigningShipment] = useState(false);
    const [dispatchingDocs, setDispatchingDocs] = useState(false);
    
    const fetchVehicle = useCallback(async () => {
        try {
            const res = await fetch(`/api/vehicle-export/vehicles/${id}`);
            if (res.ok) {
                const data = await res.json();
                setVehicle(data.vehicle);
            }
        } catch (error) {
            console.error('Error fetching vehicle:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchVehicle();
    }, [fetchVehicle]);

    const [isDownloading, setIsDownloading] = useState(false);

    const downloadAllImages = async () => {
        if (!vehicle?.photos?.length) return;
        setIsDownloading(true);
        const zip = new JSZip();

        try {
            const fetchPromises = vehicle.photos.map(async (photo, index) => {
                const response = await fetch(photo.url);
                const blob = await response.blob();
                const extension = photo.url.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
                const filename = `vehicle-${vehicle.stockNumber}-${index + 1}.${extension}`;
                zip.file(filename, blob);
            });

            await Promise.all(fetchPromises);
            const content = await zip.generateAsync({ type: 'blob' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${vehicle.stockNumber}-pictures.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Download Failed');
        } finally {
            setIsDownloading(false);
        }
    };

    const updateVehicle = async (data: any) => {
        setUpdating(true);
        try {
            const res = await fetch(`/api/vehicle-export/vehicles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const updated = await res.json();
                setVehicle(updated.vehicle);
                toast.success('Updated Successfully', { description: 'Vehicle details saved.' });
            } else {
                toast.error('Update Failed');
            }
        } catch (error) {
            toast.error('Error');
        } finally {
            setUpdating(false);
        }
    };

    const updateStatus = (status: string) => updateVehicle({ status });

    const handleGenerateInvoice = async () => {
        setGeneratingInvoice(true);
        try {
            const res = await fetch(`/api/vehicle-export/vehicles/${id}/invoice`);
            const data = await res.json();

            if (res.ok) {
                toast.success('Invoice Generated', { description: `Invoice #${data.invoiceNumber} created.` });
                fetchVehicle(); // Refresh data to show invoice
            } else {
                toast.error('Generation Failed', { description: data.error });
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to generate invoice' });
        } finally {
            setGeneratingInvoice(false);
        }
    };

    const fetchShipments = async () => {
        try {
            const res = await fetch('/api/vehicle-export/shipments?status=BOOKED');
            const data = await res.json();
            if (data.shipments) {
                setAvailableShipments(data.shipments);
            }
        } catch (error) {
            console.error('Failed to fetch shipments', error);
        }
    };

    const handleAssignShipment = async (shipmentId: string) => {
        setAssigningShipment(true);
        try {
            const res = await fetch('/api/vehicle-export/shipments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'assign',
                    shipmentId,
                    vehicleIds: [id]
                })
            });

            if (res.ok) {
                toast.success('Assigned to Shipment', { description: 'Vehicle has been added to the manifest.' });
                await fetchVehicle();
            } else {
                const error = await res.json();
                toast.error('Assignment Failed', { description: error.error });
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to assign shipment' });
        } finally {
            setAssigningShipment(false);
        }
    };

    const handleDispatchDocuments = async (data: any) => {
        setDispatchingDocs(true);
        try {
            const res = await fetch('/api/vehicle-export/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicleId: id,
                    ...data
                })
            });

            if (res.ok) {
                toast.success('Documents Dispatched', { description: 'Tracking information saved.' });
                await fetchVehicle();
            } else {
                const error = await res.json();
                toast.error('Dispatch Failed', { description: error.error });
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to dispatch documents' });
        } finally {
            setDispatchingDocs(false);
        }
    };

    const handleDetailPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setUpdating(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('field', 'vehicle-photo');

        try {
            const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
            const upData = await upRes.json();

            if (upData.success) {
                const attachRes = await fetch(`/api/vehicle-export/vehicles/${id}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: upData.url })
                });

                if (attachRes.ok) {
                    await fetchVehicle();
                    toast.error('Photo Added');
                } else {
                    toast.success('Attach Failed');
                }
            } else {
                toast.error('Upload Failed', { description: upData.error });
            }
        } catch (error) {
            toast.error('Error', { description: 'Photo upload failed' });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <DetailSkeleton />;
    if (!vehicle) return <NotFoundState />;

    const primaryPhoto = vehicle.photos?.[0]?.url;

    return (
        <div className="min-h-screen bg-transparent pb-12">
            {/* Hero Header */}
            <div className="relative h-[300px] sm:h-[400px] w-full overflow-hidden">
                {/* Background Image with Blur */}
                <div className="absolute inset-0 z-0">
                    {primaryPhoto ? (
                        <div className="relative w-full h-full">
                            <img src={primaryPhoto} alt="Hero" className="w-full h-full object-cover blur-xl opacity-50 scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/40 to-white dark:from-black/10 dark:via-gray-950/40 dark:to-slate-950/50" />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-slate-200 dark:from-blue-900/40 dark:to-slate-900" />
                    )}
                </div>

                {/* Hero Content */}
                <div className="relative z-10 container mx-auto px-4 sm:px-8 h-full flex flex-col justify-end pb-8">
                    <FadeIn delay={0.1}>
                        <div className="flex items-center gap-4 mb-4">
                            <Link href="/vehicle-export/inventory">
                                <Button size="icon" variant="secondary" className="rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md shadow-sm hover:bg-white dark:hover:bg-black/70">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <Badge variant="outline" className={cn("px-3 py-1 font-mono bg-white/50 dark:bg-black/50 backdrop-blur-md", STATUS_CONFIG[vehicle.status]?.color)}>
                                {STATUS_CONFIG[vehicle.status]?.label || vehicle.status}
                            </Badge>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 mt-3 text-lg font-medium text-gray-700 dark:text-gray-200">
                                    <span className="flex items-center gap-1.5 bg-white/30 dark:bg-black/30 px-3 py-1 rounded-lg backdrop-blur-sm">
                                        <Package className="h-5 w-5 text-blue-600" />
                                        {vehicle.stockNumber}
                                    </span>
                                    {/* ... existing badges ... */}
                                </div>
                            </div>

                            <div className="flex gap-3 items-center">
                                <div className="flex items-center gap-2 bg-white/50 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 h-12">
                                    <Switch
                                        id="publish-mode"
                                        checked={vehicle.isPublished}
                                        onCheckedChange={(checked) => updateVehicle({ isPublished: checked })}
                                    />
                                    <Label htmlFor="publish-mode" className="cursor-pointer font-medium">
                                        {vehicle.isPublished ? 'Published' : 'Draft'}
                                    </Label>
                                </div>

                                <Select value={vehicle.status} onValueChange={updateStatus} disabled={updating}>
                                    <SelectTrigger className="w-[180px] h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/20 shadow-lg">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WON_AT_AUCTION">Won at Auction</SelectItem>
                                        <SelectItem value="IN_YARD">In Yard</SelectItem>
                                        <SelectItem value="READY_TO_SHIP">Ready to Ship</SelectItem>
                                        <SelectItem value="SHIPPED">Shipped</SelectItem>
                                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                                        <SelectItem value="SOLD">Sold</SelectItem>
                                        <SelectItem value="RESERVED">Reserved</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </div >

            {/* Main Content */}
            < div className="container mx-auto px-4 sm:px-8 mt-8" >
                <Tabs defaultValue="overview" className="space-y-8">
                    <TabsList className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-1 rounded-xl border border-white/20 shadow-sm flex w-full md:w-auto overflow-x-auto no-scrollbar">
                        {['Overview', 'Compliance', 'Financials', 'Logistics', 'Documents'].map(tab => (
                            <TabsTrigger
                                key={tab}
                                value={tab.toLowerCase()}
                                className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-md transition-all whitespace-nowrap flex-shrink-0"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview">
                        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Photo Gallery (Main) */}
                            <StaggerItem className="md:col-span-2">
                                <MotionCard className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-full overflow-hidden group">
                                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                                        {primaryPhoto ? (
                                            <img src={primaryPhoto} alt="Main" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                                <Camera className="h-12 w-12 mb-2 opacity-50" />
                                                Photos Pending
                                            </div>
                                        )}
                                        <div className="absolute bottom-4 right-4 flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={downloadAllImages}
                                                disabled={isDownloading || !vehicle.photos?.length}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8"
                                            >
                                                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                                Download All
                                            </Button>
                                            <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                                {vehicle.photos?.length || 0} Photos
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 grid grid-cols-4 sm:grid-cols-5 gap-2">
                                        {(vehicle.photos || []).map((photo, i) => (
                                            <div key={photo.id} className={cn("aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer relative group", i === 0 ? "ring-2 ring-indigo-500" : "")}>
                                                <img src={photo.url} alt={`Thumb ${i}`} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                                            </div>
                                        ))}
                                        <label className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors">
                                            <Upload className="h-5 w-5 text-indigo-600" />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleDetailPhotoUpload} />
                                        </label>
                                    </div>
                                </MotionCard>
                            </StaggerItem>

                            {/* Specs Widget */}
                            <StaggerItem className="space-y-6">
                                <MotionCard className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 border-white/20">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Info className="h-5 w-5 text-blue-500" />
                                        Vehicle Specs
                                    </h3>
                                    <div className="space-y-4">
                                        <SpecRow label="Chassis" value={vehicle.chassisNumber} icon={Package} />
                                        <SpecRow label="Engine" value={`${vehicle.engineCode || '?'} (${vehicle.engineCc || '-'}cc)`} icon={Gauge} />
                                        <SpecRow label="Fuel" value={vehicle.fuelType} icon={Fuel} />
                                        <SpecRow label="Mileage" value={vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '-'} icon={Clock} />
                                        <SpecRow label="Color" value={vehicle.color} icon={User} />
                                        <SpecRow label="Transmission" value={vehicle.transmission} icon={Gauge} />
                                    </div>
                                </MotionCard>

                                <MotionCard className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 border-white/20">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <User className="h-5 w-5 text-indigo-500" />
                                        Customer
                                    </h3>
                                    {vehicle.customer ? (
                                        <div>
                                            <p className="font-medium text-lg">{vehicle.customer.name}</p>
                                            <p className="text-sm text-gray-500">{vehicle.customer.email}</p>
                                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 bg-gray-100/50 dark:bg-gray-800/50 p-2 rounded-lg">
                                                <MapPin className="h-4 w-4" />
                                                {vehicle.customer.country || 'Unknown Country'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                            <p className="text-gray-400 text-sm">No customer assigned</p>
                                            <Button variant="link" size="sm" className="text-blue-500">Assign Customer</Button>
                                        </div>
                                    )}
                                </MotionCard>
                            </StaggerItem>
                        </StaggerContainer>
                    </TabsContent>

                    {/* Financials Tab */}
                    <TabsContent value="financials">
                        <SlideUp>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <MotionCard className="md:col-span-2 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-emerald-500" />
                                        Cost Breakdown
                                        <EditFinancialsDialog vehicle={vehicle} onUpdate={updateVehicle} />
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <CostCard label="Purchase Price" amount={vehicle.purchasePrice} />
                                            <CostCard label="FOB Price" amount={vehicle.fobPrice} color="text-blue-600" />
                                            <CostCard label="CIF Price" amount={vehicle.cifPrice} color="text-purple-600" />
                                        </div>
                                        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Additional Costs</p>
                                                <div className="flex justify-between text-sm"><span className="text-gray-600">Tax</span> <span>{formatCurrency(vehicle.taxAmount)}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-gray-600">Duty</span> <span>{formatCurrency(vehicle.dutyAmount)}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-gray-600">Shipping</span> <span>{formatCurrency(vehicle.shippingCost)}</span></div>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium text-emerald-900 dark:text-emerald-100">Invoice Status</span>
                                                    <Badge variant={vehicle.invoice?.status === 'PAID' ? 'default' : 'outline'}>
                                                        {vehicle.invoice?.status || 'NOT GENERATED'}
                                                    </Badge>
                                                </div>
                                                {vehicle.invoice ? (
                                                    <div>
                                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(vehicle.invoice.totalAmount)}</p>
                                                        <p className="text-xs text-emerald-600/70 font-mono mt-1">#{vehicle.invoice.invoiceNumber}</p>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={handleGenerateInvoice}
                                                        disabled={generatingInvoice}
                                                    >
                                                        {generatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Invoice'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </MotionCard>
                            </div>
                        </SlideUp>
                    </TabsContent>

                    {/* Logistics Tab */}
                    <TabsContent value="logistics">
                        <SlideUp>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <MotionCard className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <Ship className="h-5 w-5 text-blue-500" />
                                        Shipment Details
                                    </h3>
                                    {vehicle.shipment ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                                    <Anchor className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Vessel Name</p>
                                                    <p className="text-lg font-bold">{vehicle.shipment.vesselName || 'TBD'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                                <div>
                                                    <p className="text-xs text-blue-600/70 uppercase font-bold">Shipment #</p>
                                                    <p className="font-mono">{vehicle.shipment.shipmentNumber}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-600/70 uppercase font-bold">Status</p>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{vehicle.shipment.status}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <Ship className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 mb-4">No shipment assigned</p>
                                            <AssignShipmentDialog
                                                shipments={availableShipments}
                                                onOpen={fetchShipments}
                                                onAssign={handleAssignShipment}
                                                loading={assigningShipment}
                                            />
                                        </div>
                                    )}
                                </MotionCard>
                            </div>
                        </SlideUp>
                    </TabsContent>

                    {/* Compliance Tab */}
                    <TabsContent value="compliance">
                        <SlideUp>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <MotionCard className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <ClipboardCheck className="h-5 w-5 text-green-500" />
                                        Inspection Status
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                            <span className="text-gray-600 dark:text-gray-400">Shaken</span>
                                            <Badge variant={vehicle.shakenStatus === 'PASSED' ? 'default' : 'secondary'}>
                                                {vehicle.shakenStatus || 'Pending'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                            <span className="text-gray-600 dark:text-gray-400">Masho</span>
                                            <Badge variant={vehicle.mashoStatus === 'PASSED' ? 'default' : 'secondary'}>
                                                {vehicle.mashoStatus || 'Pending'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-gray-600 dark:text-gray-400">JAAI</span>
                                            <Badge variant={vehicle.jaaiStatus === 'PASSED' ? 'default' : 'secondary'}>
                                                {vehicle.jaaiStatus || 'Pending'}
                                            </Badge>
                                        </div>
                                    </div>
                                </MotionCard>
                            </div>
                        </SlideUp>
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents">
                        <SlideUp>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <MotionCard className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <ClipboardCheck className="h-5 w-5 text-amber-500" />
                                        Document Status
                                    </h3>
                                    {vehicle.documents ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Status</span>
                                                <Badge>{vehicle.documents.status}</Badge>
                                            </div>
                                            {vehicle.documents.courierName && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Courier</span>
                                                    <span className="font-medium">{vehicle.documents.courierName}</span>
                                                </div>
                                            )}
                                            {vehicle.documents.trackingNumber && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Tracking #</span>
                                                    <span className="font-mono text-sm">{vehicle.documents.trackingNumber}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <ClipboardCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 mb-4">No documents uploaded</p>
                                            <DocumentDispatchDialog
                                                invoiceStatus={vehicle.invoice?.status}
                                                onDispatch={handleDispatchDocuments}
                                                loading={dispatchingDocs}
                                            />
                                        </div>
                                    )}
                                </MotionCard>
                            </div>
                        </SlideUp>
                    </TabsContent>
                </Tabs>
            </div >
        </div >
    );
}

// --- Subcomponents ---

function DetailSkeleton() {
    return (
        <div className="min-h-screen p-8 space-y-8 animate-pulse">
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            </div>
        </div>
    );
}

function NotFoundState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <Package className="h-20 w-20 text-gray-200 dark:text-gray-800 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicle Not Found</h2>
            <p className="text-gray-500 mt-2 mb-6">The vehicle you are looking for does not exist or has been removed.</p>
            <Link href="/vehicle-export/inventory">
                <Button>Return to Inventory</Button>
            </Link>
        </div>
    );
}

function SpecRow({ label, value, icon: Icon }: any) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="flex items-center gap-2 text-gray-500">
                <Icon className="h-4 w-4 opacity-50" />
                <span className="text-sm">{label}</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{value || '—'}</span>
        </div>
    );
}

function CostCard({ label, amount, color = "text-gray-900 dark:text-white" }: any) {
    return (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={cn("text-xl font-bold", color)}>{formatCurrency(amount)}</p>
        </div>
    );
}

function EditFinancialsDialog({ vehicle, onUpdate }: { vehicle: Vehicle, onUpdate: (data: any) => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        purchasePrice: vehicle.purchasePrice || 0,
        fobPrice: vehicle.fobPrice || 0,
        cifPrice: vehicle.cifPrice || 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onUpdate({
            purchasePrice: Number(formData.purchasePrice),
            fobPrice: Number(formData.fobPrice),
            cifPrice: Number(formData.cifPrice),
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0 transform scale-75">
                    <PenSquare className="h-5 w-5 text-gray-400 hover:text-blue-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Financials</DialogTitle>
                    <DialogDescription>
                        Set the cost structure for this vehicle. FOB Price is the displayed selling price.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="purchasePrice" className="text-right">
                            Purchase
                        </Label>
                        <Input
                            id="purchasePrice"
                            type="number"
                            value={formData.purchasePrice}
                            onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded -mx-2">
                        <Label htmlFor="fobPrice" className="text-right text-blue-600 font-bold">
                            FOB Price
                        </Label>
                        <Input
                            id="fobPrice"
                            type="number"
                            value={formData.fobPrice}
                            onChange={(e) => setFormData({ ...formData, fobPrice: Number(e.target.value) })}
                            className="col-span-3 border-blue-200 focus-visible:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cifPrice" className="text-right text-purple-600">
                            CIF Price
                        </Label>
                        <Input
                            id="cifPrice"
                            type="number"
                            value={formData.cifPrice}
                            onChange={(e) => setFormData({ ...formData, cifPrice: Number(e.target.value) })}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AssignShipmentDialog({ shipments, onOpen, onAssign, loading }: { shipments: any[], onOpen: () => void, onAssign: (id: string) => Promise<void>, loading: boolean }) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string>('');

    return (
        <Dialog open={open} onOpenChange={(v) => {
            setOpen(v);
            if (v) onOpen();
        }}>
            <DialogTrigger asChild>
                <Button>Assign to Shipment</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Select Shipment</DialogTitle>
                    <DialogDescription>
                        Choose an upcoming shipment for this vehicle. Only "Booked" shipments are shown.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a vessel..." />
                        </SelectTrigger>
                        <SelectContent>
                            {shipments.length === 0 ? (
                                <div className="p-2 text-sm text-gray-500 text-center">No active shipments found</div>
                            ) : (
                                shipments.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.vesselName} ({s.shipmentNumber}) - {new Date(s.etd).toLocaleDateString()}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button onClick={async () => {
                        if (selectedId) {
                            await onAssign(selectedId);
                            setOpen(false);
                        }
                    }} disabled={!selectedId || loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign Vehicle'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DocumentDispatchDialog({ invoiceStatus, onDispatch, loading }: { invoiceStatus?: string, onDispatch: (data: any) => Promise<void>, loading: boolean }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        courierName: 'DHL',
        trackingNumber: '',
    });

    const isPaid = invoiceStatus === 'PAID';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Dispatch Documents</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Dispatch Documents</DialogTitle>
                    <DialogDescription>
                        Enter courier details to dispatch documents to the customer.
                    </DialogDescription>
                </DialogHeader>

                {!isPaid && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex gap-3 items-start">
                        <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                            <p className="font-bold">Warning: Invoice Unpaid</p>
                            <p>The customer has not yet paid for this vehicle. Dispatching documents now is not recommended.</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="courier" className="text-right">Courier</Label>
                        <Select value={formData.courierName} onValueChange={(v) => setFormData({ ...formData, courierName: v })}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DHL">DHL</SelectItem>
                                <SelectItem value="FedEx">FedEx</SelectItem>
                                <SelectItem value="UPS">UPS</SelectItem>
                                <SelectItem value="EMS">EMS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tracking" className="text-right">Tracking #</Label>
                        <Input
                            id="tracking"
                            value={formData.trackingNumber}
                            onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                            className="col-span-3"
                            placeholder="e.g. 1234567890"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={async () => {
                        if (formData.trackingNumber) {
                            await onDispatch(formData);
                            setOpen(false);
                        }
                    }} disabled={!formData.trackingNumber || loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Dispatch'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
