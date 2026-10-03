'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    UserCheck,
    UserX,
    Users,
    Clock,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Bed,
    CalendarDays,
    Search,
    Phone,
    Mail,
    IdCard,
    Loader2,
    Plus,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format, isToday, differenceInDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';

interface Booking {
    id: string;
    bookingNumber: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    totalAmount: number;
    paidAmount: number;
    status: string;
    specialRequests?: string;
    checkedInAt?: string;
    checkedOutAt?: string;
    idVerified: boolean;
    depositAmount: number;
    paymentMethod?: string;
    room: {
        id: string;
        roomNumber: string;
        roomType: string;
        floor?: number;
    };
}

export default function FrontDeskPage() {
    const { data: session } = useSession();
    const tenantId = (session?.user as any)?.tenantId;
    const { settings } = useSettings();
    const currency = settings.currency;

    const [loading, setLoading] = useState(true);
    const [arrivals, setArrivals] = useState<Booking[]>([]);
    const [departures, setDepartures] = useState<Booking[]>([]);
    const [inHouse, setInHouse] = useState<Booking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
    const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Check-in form state
    const [checkInForm, setCheckInForm] = useState({
        idVerified: false,
        idType: '',
        idNumber: '',
        paymentMethod: 'CASH',
        depositAmount: 0,
    });

    // Walk-in state
    const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);
    const [walkInForm, setWalkInForm] = useState({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        roomId: '',
        checkIn: format(new Date(), 'yyyy-MM-dd'),
        checkOut: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
        totalAmount: 0,
    });

    useEffect(() => {
        if (tenantId) {
            fetchFrontDeskData();
            fetchRooms();
        }
    }, [tenantId]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`/api/hotel/rooms?tenantId=${tenantId}`);
            if (res.ok) {
                setRooms(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch rooms');
        }
    };

    const handleWalkIn = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/hotel/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    ...walkInForm,
                    status: 'CONFIRMED'
                })
            });

            if (res.ok) {
                toast.success('Walk-in booking created');
                setWalkInDialogOpen(false);
                fetchFrontDeskData();
                // Reset form
                setWalkInForm({
                    guestName: '',
                    guestEmail: '',
                    guestPhone: '',
                    roomId: '',
                    checkIn: format(new Date(), 'yyyy-MM-dd'),
                    checkOut: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
                    totalAmount: 0,
                });
            } else {
                toast.error('Failed to create booking');
            }
        } catch (error) {
            toast.error('Failed to create booking');
        } finally {
            setProcessing(false);
        }
    };

    const fetchFrontDeskData = async () => {
        try {
            setLoading(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            // Fetch all bookings and filter on client side for now
            const res = await fetch(`/api/hotel/bookings?tenantId=${tenantId}`);
            if (res.ok) {
                const bookings = await res.json();
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);

                // Filter arrivals (check-in today, not checked in yet)
                setArrivals(bookings.filter((b: Booking) => {
                    const checkInDate = new Date(b.checkIn);
                    checkInDate.setHours(0, 0, 0, 0);
                    return checkInDate.getTime() === todayDate.getTime() &&
                        b.status === 'CONFIRMED' &&
                        !b.checkedInAt;
                }));

                // Filter departures (check-out today, checked in but not out)
                setDepartures(bookings.filter((b: Booking) => {
                    const checkOutDate = new Date(b.checkOut);
                    checkOutDate.setHours(0, 0, 0, 0);
                    return checkOutDate.getTime() === todayDate.getTime() &&
                        (b.status === 'CHECKED_IN' || b.checkedInAt) &&
                        !b.checkedOutAt;
                }));

                // In-house guests (checked in, not checked out)
                setInHouse(bookings.filter((b: Booking) =>
                    (b.status === 'CHECKED_IN' || b.checkedInAt) && !b.checkedOutAt
                ));
            }
        } catch (error) {
            console.error('Error fetching front desk data:', error);
            toast.error('Failed to load front desk data');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        if (!selectedBooking) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/hotel/bookings/${selectedBooking.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'CHECKED_IN',
                    checkedInAt: new Date().toISOString(),
                    checkedInBy: (session?.user as any)?.id,
                    idVerified: checkInForm.idVerified,
                    paymentMethod: checkInForm.paymentMethod,
                    depositAmount: checkInForm.depositAmount,
                }),
            });

            if (res.ok) {
                toast.success(`Guest ${selectedBooking.guestName} checked in successfully!`, {
                    description: `Room ${selectedBooking.room.roomNumber}`,
                });
                setCheckInDialogOpen(false);
                fetchFrontDeskData();
            } else {
                toast.error('Check-in failed');
            }
        } catch (error) {
            toast.error('Check-in failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleCheckOut = async () => {
        if (!selectedBooking) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/hotel/bookings/${selectedBooking.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'CHECKED_OUT',
                    checkedOutAt: new Date().toISOString(),
                }),
            });

            if (res.ok) {
                toast.success(`Guest ${selectedBooking.guestName} checked out successfully!`);
                setCheckOutDialogOpen(false);
                fetchFrontDeskData();
            } else {
                toast.error('Check-out failed');
            }
        } catch (error) {
            toast.error('Check-out failed');
        } finally {
            setProcessing(false);
        }
    };

    const openCheckInDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setCheckInForm({
            idVerified: false,
            idType: '',
            idNumber: '',
            paymentMethod: 'CASH',
            depositAmount: booking.totalAmount - booking.paidAmount,
        });
        setCheckInDialogOpen(true);
    };

    const openCheckOutDialog = (booking: Booking) => {
        setSelectedBooking(booking);
        setCheckOutDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/hotel">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Front Desk
                        </h1>
                        <p className="text-muted-foreground">
                            {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={fetchFrontDeskData}>
                        Refresh
                    </Button>
                    <Link href="/hotel/guests">
                        <Button variant="outline" className="gap-2">
                            <Users className="h-4 w-4" /> Guest Lookup
                        </Button>
                    </Link>
                    <Button onClick={() => setWalkInDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> New Walk-In
                    </Button>
                </div>
            </div>

            {/* Walk-In Dialog */}
            <Dialog open={walkInDialogOpen} onOpenChange={setWalkInDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Walk-In Booking</DialogTitle>
                        <DialogDescription>Create a new reservation for a guest arriving now.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Guest Name</Label>
                                <Input
                                    value={walkInForm.guestName}
                                    onChange={(e) => setWalkInForm({ ...walkInForm, guestName: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone / Email</Label>
                                <Input
                                    value={walkInForm.guestEmail}
                                    onChange={(e) => setWalkInForm({ ...walkInForm, guestEmail: e.target.value })}
                                    placeholder="contact@example.com"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Check In</Label>
                                <Input
                                    type="date"
                                    value={walkInForm.checkIn}
                                    onChange={(e) => setWalkInForm({ ...walkInForm, checkIn: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Check Out</Label>
                                <Input
                                    type="date"
                                    value={walkInForm.checkOut}
                                    onChange={(e) => setWalkInForm({ ...walkInForm, checkOut: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Room</Label>
                            <Select
                                value={walkInForm.roomId}
                                onValueChange={(v) => {
                                    const room = rooms.find(r => r.id === v);
                                    setWalkInForm({
                                        ...walkInForm,
                                        roomId: v,
                                        totalAmount: room ? room.basePrice : 0 // Basic price logic
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a room..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {rooms.filter(r => r.status === 'AVAILABLE').map((room) => (
                                        <SelectItem key={room.id} value={room.id}>
                                            Room {room.roomNumber} ({room.roomType}) - {formatCurrency(room.basePrice, currency)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <Input
                                type="number"
                                value={walkInForm.totalAmount}
                                onChange={(e) => setWalkInForm({ ...walkInForm, totalAmount: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setWalkInDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleWalkIn} disabled={processing}>Confirm Booking</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Summary Cards - Modern Glass Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                    <CardHeader className="relative pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Today's Arrivals</CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="flex items-center justify-between">
                            <span className="text-4xl font-bold">{arrivals.length}</span>
                            <div className="p-3 bg-white/20 rounded-xl">
                                <UserCheck className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-sm opacity-75 mt-2">guests expected</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-red-500 text-white">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                    <CardHeader className="relative pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Today's Departures</CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="flex items-center justify-between">
                            <span className="text-4xl font-bold">{departures.length}</span>
                            <div className="p-3 bg-white/20 rounded-xl">
                                <UserX className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-sm opacity-75 mt-2">checking out</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                    <CardHeader className="relative pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">In-House Guests</CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="flex items-center justify-between">
                            <span className="text-4xl font-bold">{inHouse.length}</span>
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Bed className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-sm opacity-75 mt-2">currently staying</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                    <CardHeader className="relative pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Current Time</CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="flex items-center justify-between">
                            <span className="text-4xl font-bold">{format(new Date(), 'HH:mm')}</span>
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Clock className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-sm opacity-75 mt-2">{format(new Date(), 'z')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content - Tabs */}
            <Tabs defaultValue="arrivals" className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="arrivals" className="gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                        <UserCheck className="h-4 w-4" /> Arrivals ({arrivals.length})
                    </TabsTrigger>
                    <TabsTrigger value="departures" className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <UserX className="h-4 w-4" /> Departures ({departures.length})
                    </TabsTrigger>
                    <TabsTrigger value="inhouse" className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        <Bed className="h-4 w-4" /> In-House ({inHouse.length})
                    </TabsTrigger>
                </TabsList>

                {/* Arrivals Tab */}
                <TabsContent value="arrivals">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <UserCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                                Expected Arrivals
                            </CardTitle>
                            <CardDescription>Guests checking in today</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {arrivals.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg">No arrivals expected today</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Guest</TableHead>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Stay</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {arrivals.map((booking) => (
                                            <TableRow key={booking.id} className="hover:bg-emerald-50/50 transition-colors">
                                                <TableCell>
                                                    <div className="font-medium">{booking.guestName}</div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3" /> {booking.guestEmail}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono">
                                                        {booking.room.roomNumber}
                                                    </Badge>
                                                    <div className="text-xs text-muted-foreground">{booking.room.roomType}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{booking.nights} night{booking.nights > 1 ? 's' : ''}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(booking.checkOut), 'MMM d')} checkout
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`font-medium ${booking.totalAmount - booking.paidAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                        {formatCurrency(booking.totalAmount - booking.paidAmount, currency)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                        Pending
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                                                        onClick={() => openCheckInDialog(booking)}
                                                    >
                                                        <UserCheck className="h-4 w-4 mr-1" /> Check In
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Departures Tab */}
                <TabsContent value="departures">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <UserX className="h-5 w-5 text-orange-600" />
                                </div>
                                Expected Departures
                            </CardTitle>
                            <CardDescription>Guests checking out today</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {departures.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <UserX className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg">No departures expected today</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Guest</TableHead>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Balance Due</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {departures.map((booking) => (
                                            <TableRow key={booking.id} className="hover:bg-orange-50/50 transition-colors">
                                                <TableCell>
                                                    <div className="font-medium">{booking.guestName}</div>
                                                    <div className="text-sm text-muted-foreground">{booking.guestPhone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono">
                                                        {booking.room.roomNumber}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`font-medium ${booking.totalAmount - booking.paidAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {formatCurrency(booking.totalAmount - booking.paidAmount, currency)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                                        Checked In
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                                        onClick={() => openCheckOutDialog(booking)}
                                                    >
                                                        <UserX className="h-4 w-4 mr-1" /> Check Out
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* In-House Tab */}
                <TabsContent value="inhouse">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Bed className="h-5 w-5 text-blue-600" />
                                </div>
                                In-House Guests
                            </CardTitle>
                            <CardDescription>Currently staying at the hotel</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {inHouse.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Bed className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg">No guests currently in-house</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Guest</TableHead>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Check-out</TableHead>
                                            <TableHead>Nights Left</TableHead>
                                            <TableHead>Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inHouse.map((booking) => {
                                            const nightsLeft = differenceInDays(new Date(booking.checkOut), new Date());
                                            return (
                                                <TableRow key={booking.id} className="hover:bg-blue-50/50 transition-colors">
                                                    <TableCell>
                                                        <div className="font-medium">{booking.guestName}</div>
                                                        <div className="text-sm text-muted-foreground">{booking.guestEmail}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono text-lg">
                                                            {booking.room.roomNumber}
                                                        </Badge>
                                                        <div className="text-xs text-muted-foreground mt-1">{booking.room.roomType}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-medium">
                                                            {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={nightsLeft <= 1 ? 'destructive' : 'secondary'}>
                                                            {nightsLeft} night{nightsLeft !== 1 ? 's' : ''}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={`font-medium ${booking.totalAmount - booking.paidAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                            {formatCurrency(booking.totalAmount - booking.paidAmount, currency)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link href={`/hotel/bookings/${booking.id}/folio`}>
                                                            <Button size="sm" variant="ghost" className="mr-2">
                                                                <CreditCard className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Check-In Dialog */}
            <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <UserCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            Guest Check-In
                        </DialogTitle>
                        <DialogDescription>
                            {selectedBooking?.guestName} • Room {selectedBooking?.room.roomNumber}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Guest Summary */}
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Booking</span>
                                <span className="font-mono">{selectedBooking?.bookingNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Stay</span>
                                <span>{selectedBooking?.nights} night(s)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Check-out</span>
                                <span>{selectedBooking && format(new Date(selectedBooking.checkOut), 'MMM d, yyyy')}</span>
                            </div>
                        </div>

                        {/* ID Verification */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <IdCard className="h-4 w-4" /> ID Verification
                            </Label>
                            <div className="flex items-center gap-3">
                                <Select
                                    value={checkInForm.idType}
                                    onValueChange={(v) => setCheckInForm({ ...checkInForm, idType: v, idVerified: !!v })}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="ID Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PASSPORT">Passport</SelectItem>
                                        <SelectItem value="NIC">NIC</SelectItem>
                                        <SelectItem value="LICENSE">Driver's License</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="ID Number"
                                    value={checkInForm.idNumber}
                                    onChange={(e) => setCheckInForm({ ...checkInForm, idNumber: e.target.value })}
                                    className="flex-1"
                                />
                                {checkInForm.idVerified && (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                )}
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" /> Payment
                            </Label>
                            <div className="flex gap-3">
                                <Select
                                    value={checkInForm.paymentMethod}
                                    onValueChange={(v) => setCheckInForm({ ...checkInForm, paymentMethod: v })}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CARD">Card</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex-1">
                                    <Label className="text-xs text-muted-foreground">Deposit Amount</Label>
                                    <Input
                                        type="number"
                                        value={checkInForm.depositAmount}
                                        onChange={(e) => setCheckInForm({ ...checkInForm, depositAmount: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Balance */}
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Balance Due</span>
                                <span className="text-2xl font-bold text-emerald-700">
                                    {selectedBooking && formatCurrency(selectedBooking.totalAmount - selectedBooking.paidAmount - checkInForm.depositAmount, currency)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCheckIn}
                            disabled={processing}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                        >
                            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Complete Check-In
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Check-Out Dialog */}
            <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <UserX className="h-5 w-5 text-orange-600" />
                            </div>
                            Guest Check-Out
                        </DialogTitle>
                        <DialogDescription>
                            {selectedBooking?.guestName} • Room {selectedBooking?.room.roomNumber}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Stay Summary */}
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Room Total</span>
                                <span>{selectedBooking && formatCurrency(selectedBooking.totalAmount, currency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Paid</span>
                                <span className="text-emerald-600">-{selectedBooking && formatCurrency(selectedBooking.paidAmount, currency)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-medium text-lg">
                                <span>Balance Due</span>
                                <span className={selectedBooking && (selectedBooking.totalAmount - selectedBooking.paidAmount) > 0 ? 'text-red-600' : 'text-emerald-600'}>
                                    {selectedBooking && formatCurrency(selectedBooking.totalAmount - selectedBooking.paidAmount, currency)}
                                </span>
                            </div>
                        </div>

                        {(selectedBooking && selectedBooking.totalAmount - selectedBooking.paidAmount > 0) && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg">
                                <AlertCircle className="h-5 w-5" />
                                <span className="text-sm">Guest has an outstanding balance</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCheckOutDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCheckOut}
                            disabled={processing}
                            className="bg-gradient-to-r from-orange-500 to-red-500"
                        >
                            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Complete Check-Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
