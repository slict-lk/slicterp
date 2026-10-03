"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Gavel, ArrowLeft, Loader2, CheckCircle, Car, Settings, Calendar, ChevronRight, ChevronLeft, Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FadeIn, SlideUp } from '@/components/ui/motion/primitives';

const AUCTION_HOUSES = [
    'USS Tokyo', 'USS Nagoya', 'USS Kobe', 'USS Osaka', 'USS Fukuoka',
    'TAA', 'HAA', 'JU', 'CAA', 'Other'
];

const AUCTION_GRADES = ['S', '6', '5', '4.5', '4', '3.5', '3', '2', '1', 'R', 'RA', 'RB', '***'];
const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'DCT'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'];
const MAKES = [
    'Toyota', 'Honda', 'Nissan', 'Mazda', 'Suzuki', 'Mitsubishi', 'Subaru',
    'Daihatsu', 'Isuzu', 'Lexus', 'Infiniti', 'Acura', 'Other'
];

export default function AuctionEntryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bidId = searchParams.get('bidId');
    
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [bid, setBid] = useState<any>(null);

    const [form, setForm] = useState({
        chassisNumber: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        month: 1,
        engineCode: '',
        engineCc: '',
        fuelType: 'Petrol',
        color: '',
        transmission: 'Automatic',
        mileage: '',
        purchasePrice: '',
        auctionHouse: '',
        auctionDate: new Date().toISOString().split('T')[0],
        lotNumber: '',
        auctionGrade: '',
        auctionFee: '',
        inspectionNotes: '',
        photos: [] as string[],
    });

    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const files = Array.from(e.target.files);
        const total = files.length;
        let uploadedCount = 0;
        const newPhotos: string[] = [];

        // Notification for start
        toast.success('Uploading...', { description: `Starting upload of ${total} photo(s).` });

        for (let i = 0; i < total; i++) {
            const file = files[i];

            // Force status update
            setUploadStatus(`Uploading ${i + 1}/${total}...`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to let UI render

            const formData = new FormData();
            formData.append('file', file);
            formData.append('field', 'vehicle-photo');

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (data.success) {
                    newPhotos.push(data.url);
                    uploadedCount++;
                } else {
                    toast.error('Upload Failed', { description: `Could not upload ${file.name}` });
                }
            } catch (error) {
                toast.error('Error', { description: `Failed to upload ${file.name}` });
            }
        }

        if (newPhotos.length > 0) {
            setForm(prev => ({
                ...prev,
                photos: [...prev.photos, ...newPhotos]
            }));
            toast.success('Upload Complete', { description: `Added ${uploadedCount} photos.` });
        }

        setUploadStatus(null);
        e.target.value = '';
    };

    useEffect(() => {
        if (bidId) {
            fetch(`/api/vehicle-export/bids/${bidId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.bid) {
                        setBid(data.bid);
                        setForm(prev => ({
                            ...prev,
                            make: data.bid.requestedMake || '',
                            model: data.bid.requestedModel || '',
                        }));
                    }
                });
        }
    }, [bidId]);

    const handleChange = (field: string, value: string | number) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => {
        if (step === 1) {
            if (!form.make || !form.model || !form.year) {
                toast.error('Missing Identity Info', { description: 'Please fill in Make, Model, and Year.' });
                return;
            }
        }
        if (step === 2) {
            if (!form.mileage || !form.transmission || !form.fuelType) {
                toast.error('Missing Specs', { description: 'Please fill in Mileage, Transmission, and Fuel Type.' });
                return;
            }
        }
        setStep(s => Math.min(s + 1, 4));
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        if (!form.make || !form.model || !form.year || !form.mileage || !form.transmission || !form.fuelType) {
            toast.error('Missing Fields', { description: 'Please fill in all mandatory fields.' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/vehicle-export/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    year: Number(form.year),
                    month: Number(form.month),
                    mileage: Number(form.mileage) || 0,
                    purchasePrice: Number(form.purchasePrice),
                    auctionFee: Number(form.auctionFee) || 0,
                    engineCc: Number(form.engineCc) || null,
                    customerId: bid?.customerId,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Vehicle Acquired', { description: `Stock #${data.vehicle.stockNumber} added to inventory.` });

                if (bidId) {
                    await fetch(`/api/vehicle-export/bids/${bidId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'WON' }),
                    });
                }

                router.push(`/vehicle-export/inventory/${data.vehicle.id}`);
            } else {
                const error = await res.json();
                toast.error('Error', { description: error.error });
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to create vehicle' });
        } finally {
            setLoading(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => currentYear - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const steps = [
        { id: 1, title: 'Identity', icon: Car },
        { id: 2, title: 'Specs', icon: Settings },
        { id: 3, title: 'Auction Data', icon: Gavel },
        { id: 4, title: 'Photos', icon: Camera },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black p-4 sm:p-8 flex items-center justify-center">
            <div className="max-w-3xl w-full space-y-8">

                {/* Header */}
                <FadeIn className="flex items-center justify-between">
                    <div>
                        <Link href="/vehicle-export" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Vehicle Entry</h1>
                    </div>
                    {bid && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium border border-blue-100 dark:border-blue-800">
                            Fulfilling Bid for {bid.customer?.name}
                        </div>
                    )}
                </FadeIn>

                {/* Stepper */}
                <nav aria-label="Progress">
                    <ol role="list" className="flex items-center">
                        {steps.map((s, stepIdx) => (
                            <li key={s.id} className={cn(stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '', 'relative mb-6')}>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className={cn("h-0.5 w-full", step > s.id ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800')} />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-900 hover:bg-gray-50">
                                    <s.icon className={cn("h-5 w-5", step >= s.id ? 'text-indigo-600' : 'text-gray-400')} aria-hidden="true" />
                                    {step > s.id && (
                                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="relative">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="border-0 shadow-xl shadow-indigo-500/5 dark:shadow-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-semibold">Vehicle Identity</h2>
                                            <p className="text-gray-500 text-sm">Basic identification details found on the chassis plate.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <Label>Chassis Number</Label>
                                                <Input
                                                    value={form.chassisNumber}
                                                    onChange={(e) => handleChange('chassisNumber', e.target.value.toUpperCase())}
                                                    placeholder="e.g. NHP10-1234567"
                                                    className="uppercase font-mono text-lg tracking-wider bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <Label>Make <span className="text-red-500">*</span></Label>
                                                <Select value={form.make} onValueChange={(v) => handleChange('make', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Make" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MAKES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Model <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={form.model}
                                                    onChange={(e) => handleChange('model', e.target.value)}
                                                    placeholder="e.g. Aqua"
                                                />
                                            </div>
                                            <div>
                                                <Label>Year <span className="text-red-500">*</span></Label>
                                                <Select value={form.year.toString()} onValueChange={(v) => handleChange('year', v)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Month</Label>
                                                <Select value={form.month.toString()} onValueChange={(v) => handleChange('month', v)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {months.map(m => <SelectItem key={m} value={m.toString()}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="border-0 shadow-xl shadow-indigo-500/5 dark:shadow-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-semibold">Technical Specifications</h2>
                                            <p className="text-gray-500 text-sm">Engine, transmission, and condition details.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label>Engine Code</Label>
                                                <Input value={form.engineCode} onChange={(e) => handleChange('engineCode', e.target.value.toUpperCase())} className="uppercase" placeholder="1NZ-FE" />
                                            </div>
                                            <div>
                                                <Label>Engine CC</Label>
                                                <div className="relative">
                                                    <Input type="number" value={form.engineCc} onChange={(e) => handleChange('engineCc', e.target.value)} placeholder="1500" />
                                                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">cc</span>
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Fuel <span className="text-red-500">*</span></Label>
                                                <Select value={form.fuelType} onValueChange={(v) => handleChange('fuelType', v)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Transmission <span className="text-red-500">*</span></Label>
                                                <Select value={form.transmission} onValueChange={(v) => handleChange('transmission', v)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Color</Label>
                                                <Input value={form.color} onChange={(e) => handleChange('color', e.target.value)} placeholder="Pearl White" />
                                            </div>
                                            <div>
                                                <Label>Mileage <span className="text-red-500">*</span></Label>
                                                <div className="relative">
                                                    <Input type="number" value={form.mileage} onChange={(e) => handleChange('mileage', e.target.value)} placeholder="50000" />
                                                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">km</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="border-0 shadow-xl shadow-indigo-500/5 dark:shadow-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-semibold">Auction & Costs</h2>
                                            <p className="text-gray-500 text-sm">Purchase details and initial inspection notes.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label>Auction House</Label>
                                                <Select value={form.auctionHouse} onValueChange={(v) => handleChange('auctionHouse', v)}>
                                                    <SelectTrigger><SelectValue placeholder="Select House" /></SelectTrigger>
                                                    <SelectContent>{AUCTION_HOUSES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Auction Date</Label>
                                                <Input type="date" value={form.auctionDate} onChange={(e) => handleChange('auctionDate', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>Lot Number</Label>
                                                <Input value={form.lotNumber} onChange={(e) => handleChange('lotNumber', e.target.value)} placeholder="10203" />
                                            </div>
                                            <div>
                                                <Label>Grade</Label>
                                                <Select value={form.auctionGrade} onValueChange={(v) => handleChange('auctionGrade', v)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{AUCTION_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>

                                            <div className="md:col-span-2 grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                                                <div>
                                                    <Label className="text-indigo-600 dark:text-indigo-400">Purchase Price (¥)</Label>
                                                    <Input type="number" value={form.purchasePrice} onChange={(e) => handleChange('purchasePrice', e.target.value)} className="font-bold text-lg" placeholder="0" />
                                                </div>
                                                <div>
                                                    <Label>Auction Fee (¥)</Label>
                                                    <Input type="number" value={form.auctionFee} onChange={(e) => handleChange('auctionFee', e.target.value)} placeholder="0" />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <Label>Inspection Notes</Label>
                                                <Textarea
                                                    value={form.inspectionNotes}
                                                    onChange={(e) => handleChange('inspectionNotes', e.target.value)}
                                                    rows={3}
                                                    placeholder="Initial observations..."
                                                    className="resize-none"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="border-0 shadow-xl shadow-indigo-500/5 dark:shadow-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                                    <CardContent className="p-8 space-y-6">
                                        <div className="space-y-2">
                                            <h2 className="text-xl font-semibold">Photos</h2>
                                            <p className="text-gray-500 text-sm">Upload photos of the vehicle.</p>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {form.photos.map((url, i) => (
                                                <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={url} alt={`Photo ${i}`} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                <Upload className="h-6 w-6 text-gray-400" />
                                                <span className="text-xs text-gray-500 mt-2">Upload Photo</span>
                                                <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                                            </label>
                                        </div>

                                        <div className="pt-4">
                                            <Label>Add by URL</Label>
                                            <div className="flex gap-2">
                                                <Input id="photoData" placeholder="https://example.com/photo.jpg"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = e.currentTarget.value;
                                                            if (val) {
                                                                setForm(prev => ({ ...prev, photos: [...prev.photos, val] }));
                                                                e.currentTarget.value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                                <Button type="button" variant="secondary" onClick={() => {
                                                    const input = document.getElementById('photoData') as HTMLInputElement;
                                                    if (input && input.value) {
                                                        setForm(prev => ({ ...prev, photos: [...prev.photos, input.value] }));
                                                        input.value = '';
                                                    }
                                                }}>Add</Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-between pt-4">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={step === 1}
                        className={cn("transition-opacity", step === 1 ? "opacity-0" : "opacity-100")}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    {step < 4 ? (
                        <Button
                            onClick={nextStep}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
                        >
                            Next Step <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 shadow-lg shadow-green-500/30"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <div className='flex items-center'>Confirm Purchase <CheckCircle className="h-4 w-4 ml-2" /></div>}
                        </Button>
                    )}
                </div>

            </div>
        </div>
    );
}
