'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    User,
    Search,
    Plus,
    Crown,
    History,
    Mail,
    Phone,
    Edit,
    Star,
    Shield,
    Loader2,
    Gift,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { format } from 'date-fns';

interface GuestProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    nationality?: string;
    isVIP: boolean;
    vipLevel?: string;
    loyaltyPoints: number;
    loyaltyTier?: string;
    totalStays: number;
    totalSpend: number;
    lastStayDate?: string;
}

export default function GuestProfilesPage() {
    const { data: session } = useSession();
    const tenantId = (session?.user as any)?.tenantId;
    const { settings } = useSettings();
    const currency = settings.currency;

    const [loading, setLoading] = useState(true);
    const [guests, setGuests] = useState<GuestProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        nationality: '',
        isVIP: false,
        vipLevel: 'SILVER',
        loyaltyPoints: 0,
    });

    useEffect(() => {
        if (tenantId) {
            fetchGuests();
        }
    }, [tenantId]);

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/hotel/guests?tenantId=${tenantId}`);
            if (res.ok) {
                setGuests(await res.json());
            }
        } catch (error) {
            console.error('Error fetching guests:', error);
            toast.error('Failed to load guest profiles');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGuest = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            nationality: '',
            isVIP: false,
            vipLevel: 'SILVER',
            loyaltyPoints: 0,
        });
        setIsEditMode(false);
        setIsDialogOpen(true);
    };

    const handleEditGuest = (guest: GuestProfile) => {
        setSelectedGuest(guest);
        setFormData({
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone || '',
            nationality: guest.nationality || '',
            isVIP: guest.isVIP,
            vipLevel: guest.vipLevel || 'SILVER',
            loyaltyPoints: guest.loyaltyPoints || 0,
        });
        setIsEditMode(true);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            setProcessing(true);
            // Determine if create or update
            const url = isEditMode
                ? `/api/hotel/guests/${selectedGuest?.id}`
                : `/api/hotel/guests`;

            const method = isEditMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    tenantId,
                }),
            });

            if (res.ok) {
                toast.success(isEditMode ? 'Guest profile updated' : 'Guest profile created');
                setIsDialogOpen(false);
                fetchGuests();
            } else {
                const error = await res.json();
                toast.error(error.message || 'Operation failed');
            }
        } catch (error) {
            toast.error('Operation failed');
        } finally {
            setProcessing(false);
        }
    };

    // Filter guests based on search
    const filteredGuests = guests.filter(g =>
        g.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Guest Experience
                    </h1>
                    <p className="text-muted-foreground">Manage guest profiles, preferences, and loyalty</p>
                </div>
                <Button
                    onClick={handleCreateGuest}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-200"
                >
                    <Plus className="mr-2 h-4 w-4" /> New Guest
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Total Guests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{guests.length}</div>
                        <p className="text-xs opacity-75 mt-1">Lifetime profiles</p>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">VIP Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold flex items-center gap-2">
                            {guests.filter(g => g.isVIP).length}
                            <Crown className="h-6 w-6 opacity-75" />
                        </div>
                        <p className="text-xs opacity-75 mt-1">Gold & Platinum status</p>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Total Stays</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {guests.reduce((acc, curr) => acc + (curr.totalStays || 0), 0)}
                        </div>
                        <p className="text-xs opacity-75 mt-1">Completed bookings</p>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Loyalty Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {guests.reduce((acc, curr) => acc + (curr.loyaltyPoints || 0), 0)}
                        </div>
                        <p className="text-xs opacity-75 mt-1">Total points issued</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & List */}
            <Card className="border shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Guest Directory</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Guest Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Stays</TableHead>
                                <TableHead>Total Spend</TableHead>
                                <TableHead>Last Stay</TableHead>
                                <TableHead className="text-right">Loyalty Points</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGuests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No guests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredGuests.map((guest) => (
                                    <TableRow key={guest.id} className="group hover:bg-muted/50 transition-colors">
                                        <TableCell>
                                            <div className="font-medium flex items-center gap-2">
                                                {guest.firstName} {guest.lastName}
                                                {guest.isVIP && <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {guest.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {guest.isVIP ? (
                                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
                                                    {guest.vipLevel} VIP
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">Standard</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <History className="h-3 w-3 text-muted-foreground" />
                                                {guest.totalStays} stays
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatCurrency(guest.totalSpend, currency)}</TableCell>
                                        <TableCell>
                                            {guest.lastStayDate ? format(new Date(guest.lastStayDate), 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-purple-600 font-medium">
                                            {guest.loyaltyPoints.toLocaleString()} pts
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditGuest(guest)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Guest Profile' : 'New Guest Profile'}</DialogTitle>
                        <DialogDescription>
                            Enter guest details, contact information, and VIP status.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                type="email"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nationality</label>
                                <Input
                                    value={formData.nationality}
                                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                    placeholder="United States"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">VIP Status</label>
                                <p className="text-xs text-muted-foreground">Enable special benefits</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={formData.vipLevel}
                                    onValueChange={(v) => setFormData({ ...formData, vipLevel: v })}
                                    disabled={!formData.isVIP}
                                >
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SILVER">Silver</SelectItem>
                                        <SelectItem value="GOLD">Gold</SelectItem>
                                        <SelectItem value="PLATINUM">Platinum</SelectItem>
                                        <SelectItem value="DIAMOND">Diamond</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant={formData.isVIP ? "default" : "outline"}
                                    onClick={() => setFormData({ ...formData, isVIP: !formData.isVIP })}
                                    className={formData.isVIP ? "bg-amber-500 hover:bg-amber-600" : ""}
                                >
                                    {formData.isVIP ? "Active" : "Regular"}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 border p-4 rounded-lg bg-muted/20">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Gift className="h-4 w-4 text-purple-600" /> Loyalty Balance
                            </label>
                            <div className="flex gap-4">
                                <Input
                                    type="number"
                                    value={formData.loyaltyPoints}
                                    onChange={(e) => setFormData({ ...formData, loyaltyPoints: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                />
                                <div className="flex flex-col justify-center text-xs text-muted-foreground w-full">
                                    Adjust points manually. Points determine tier eligibility.
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Update Profile' : 'Create Profile'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
