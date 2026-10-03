'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Receipt,
    Plus,
    CreditCard,
    Printer,
    FileText,
    ArrowLeft,
    ShoppingBag,
    Utensils,
    Wine,
    Waves,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';

interface FolioCharge {
    id: string;
    chargeType: string;
    description: string;
    amount: number;
    quantity: number;
    chargedAt: string;
    isVoided: boolean;
}

interface BookingDetails {
    id: string;
    guestName: string;
    room: { roomNumber: string; roomType: string };
    checkIn: string;
    checkOut: string;
    totalAmount: number; // Room charges
    paidAmount: number;
    folioCharges: FolioCharge[];
}

export default function FolioPage() {
    const { id } = useParams();
    const router = useRouter();
    const { settings } = useSettings();
    const currency = settings.currency;

    const [booking, setBooking] = useState<BookingDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form State
    const [chargeForm, setChargeForm] = useState({
        type: 'RESTAURANT',
        description: '',
        amount: 0,
        quantity: 1,
    });

    useEffect(() => {
        if (id) fetchFolio();
    }, [id]);

    const fetchFolio = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/hotel/bookings/${id}/folio`);
            if (res.ok) {
                setBooking(await res.json());
            } else {
                toast.error('Failed to load folio');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading folio');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCharge = async () => {
        try {
            setProcessing(true);
            const res = await fetch(`/api/hotel/bookings/${id}/folio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chargeForm),
            });

            if (res.ok) {
                toast.success('Charge added successfully');
                setIsAddChargeOpen(false);
                setChargeForm({ type: 'RESTAURANT', description: '', amount: 0, quantity: 1 });
                fetchFolio();
            } else {
                toast.error('Failed to add charge');
            }
        } catch (error) {
            toast.error('Error adding charge');
        } finally {
            setProcessing(false);
        }
    };

    const calculateTotal = () => {
        if (!booking) return 0;
        const roomTotal = booking.totalAmount;
        const extrasTotal = booking.folioCharges
            .filter(c => !c.isVoided)
            .reduce((acc, curr) => acc + (curr.amount * curr.quantity), 0);
        return roomTotal + extrasTotal;
    };

    const getChargeIcon = (type: string) => {
        switch (type) {
            case 'RESTAURANT': return <Utensils className="h-4 w-4" />;
            case 'MINIBAR': return <Wine className="h-4 w-4" />;
            case 'SPA': return <Waves className="h-4 w-4" />;
            case 'LAUNDRY': return <ShoppingBag className="h-4 w-4" />;
            default: return <Receipt className="h-4 w-4" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!booking) return null;

    const total = calculateTotal();
    const balance = total - booking.paidAmount;

    return (
        <div className="flex min-h-screen bg-muted/20">
            <div className="flex-1 flex flex-col p-8 max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Folio #{booking.id.slice(-6).toUpperCase()}</h1>
                            <p className="text-muted-foreground">
                                {booking.guestName} • Room {booking.room.roomNumber}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2">
                            <Printer className="h-4 w-4" /> Print Invoice
                        </Button>
                        <Button onClick={() => setIsAddChargeOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4" /> Add Charge
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Invoice Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="shadow-md border-0">
                            <CardHeader className="bg-slate-50 border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-indigo-600" />
                                    Billable Items
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Room Charge */}
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Room</Badge>
                                                    Room Charge ({booking.room.roomType})
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">1</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{formatCurrency(booking.totalAmount, currency)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(booking.totalAmount, currency)}</TableCell>
                                        </TableRow>

                                        {/* Extras */}
                                        {booking.folioCharges.map((charge) => (
                                            <TableRow key={charge.id} className={charge.isVoided ? 'opacity-50 line-through bg-muted/50' : ''}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 rounded bg-slate-100 text-slate-600">
                                                            {getChargeIcon(charge.chargeType)}
                                                        </div>
                                                        <span>{charge.description}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1 ml-7">
                                                        {format(new Date(charge.chargedAt), 'PP p')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">{charge.quantity}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{formatCurrency(charge.amount, currency)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(charge.amount * charge.quantity, currency)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="space-y-6">
                        <Card className="bg-slate-900 text-white shadow-xl border-0">
                            <CardHeader>
                                <CardTitle>Payment Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between text-sm opacity-80">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(total, currency)}</span>
                                </div>
                                <div className="flex justify-between text-sm opacity-80">
                                    <span>Taxes & Fees (0%)</span>
                                    <span>{formatCurrency(0, currency)}</span>
                                </div>
                                <div className="h-px bg-white/20 my-2" />
                                <div className="flex justify-between text-xl font-bold">
                                    <span>Total Due</span>
                                    <span>{formatCurrency(total, currency)}</span>
                                </div>

                                <div className="bg-emerald-500/20 p-3 rounded-lg flex justify-between items-center text-emerald-300 mt-4 border border-emerald-500/30">
                                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Paid</span>
                                    <span className="font-semibold">-{formatCurrency(booking.paidAmount, currency)}</span>
                                </div>

                                <div className="pt-4 mt-4 border-t border-white/10">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-medium opacity-90">Balance Outstanding</span>
                                    </div>
                                    <div className={`text-3xl font-bold ${balance > 0 ? 'text-white' : 'text-emerald-400'}`}>
                                        {formatCurrency(balance, currency)}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full bg-white text-slate-900 hover:bg-slate-100" disabled={balance <= 0}>
                                    Settle Balance
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Add Charge Dialog */}
            <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Charge to Folio</DialogTitle>
                        <DialogDescription>Add extra services or items to this room's bill.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <Select value={chargeForm.type} onValueChange={(v) => setChargeForm({ ...chargeForm, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RESTAURANT">Restaurant/Bar</SelectItem>
                                        <SelectItem value="MINIBAR">Mini Bar</SelectItem>
                                        <SelectItem value="SPA">Spa & Wellness</SelectItem>
                                        <SelectItem value="LAUNDRY">Laundry</SelectItem>
                                        <SelectItem value="TRANSPORT">Transport</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount</label>
                                <Input
                                    type="number"
                                    value={chargeForm.amount}
                                    onChange={(e) => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="e.g. Room Service Dinner"
                                value={chargeForm.description}
                                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quantity</label>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="icon" onClick={() => setChargeForm(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}>-</Button>
                                <span className="w-8 text-center">{chargeForm.quantity}</span>
                                <Button variant="outline" size="icon" onClick={() => setChargeForm(p => ({ ...p, quantity: p.quantity + 1 }))}>+</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddChargeOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCharge} disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Charge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
