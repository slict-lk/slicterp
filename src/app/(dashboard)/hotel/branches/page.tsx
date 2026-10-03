'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Plus,
    MapPin,
    Building2,
    Pencil,
    Trash2,
    ArrowLeft,
    Globe,
    DollarSign,
    Clock,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Branch {
    id: string;
    name: string;
    code: string;
    country: string;
    city: string;
    address?: string;
    timezone: string;
    currency: string;
    phone?: string;
    email?: string;
    isDefault: boolean;
    isActive: boolean;
    _count: {
        rooms: number;
        bookings: number;
    };
}

const timezones = [
    'Asia/Colombo',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
];

const currencies = [
    { code: 'LKR', name: 'Sri Lankan Rupee' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'INR', name: 'Indian Rupee' },
];

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        country: '',
        city: '',
        address: '',
        timezone: 'Asia/Colombo',
        currency: 'LKR',
        phone: '',
        email: '',
        isDefault: false,
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/hotel/branches');
            if (res.ok) {
                const data = await res.json();
                setBranches(data);
            }
        } catch (error) {
            toast.error('Failed to fetch branches');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingBranch
                ? `/api/hotel/branches/${editingBranch.id}`
                : '/api/hotel/branches';
            const method = editingBranch ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success(editingBranch ? 'Branch updated' : 'Branch created');
                fetchBranches();
                resetForm();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to save branch');
            }
        } catch (error) {
            toast.error('Failed to save branch');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this branch?')) return;

        try {
            const res = await fetch(`/api/hotel/branches/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Branch deleted');
                fetchBranches();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete branch');
            }
        } catch (error) {
            toast.error('Failed to delete branch');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            country: '',
            city: '',
            address: '',
            timezone: 'Asia/Colombo',
            currency: 'LKR',
            phone: '',
            email: '',
            isDefault: false,
        });
        setEditingBranch(null);
        setIsDialogOpen(false);
    };

    const openEditDialog = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            code: branch.code,
            country: branch.country,
            city: branch.city,
            address: branch.address || '',
            timezone: branch.timezone,
            currency: branch.currency,
            phone: branch.phone || '',
            email: branch.email || '',
            isDefault: branch.isDefault,
        });
        setIsDialogOpen(true);
    };

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
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Building2 className="h-6 w-6" />
                            Branch Management
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your hotel branches across different locations
                        </p>
                    </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsDialogOpen(open);
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Branch
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingBranch
                                    ? 'Update branch details'
                                    : 'Create a new branch for your hotel chain'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Branch Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            placeholder="e.g. SLICT Hotel Colombo"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Branch Code *</Label>
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    code: e.target.value.toUpperCase(),
                                                })
                                            }
                                            placeholder="e.g. SLICT-CMB"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country *</Label>
                                        <Input
                                            id="country"
                                            value={formData.country}
                                            onChange={(e) =>
                                                setFormData({ ...formData, country: e.target.value })
                                            }
                                            placeholder="e.g. Sri Lanka"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City *</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) =>
                                                setFormData({ ...formData, city: e.target.value })
                                            }
                                            placeholder="e.g. Colombo"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) =>
                                            setFormData({ ...formData, address: e.target.value })
                                        }
                                        placeholder="Full street address"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="timezone">Timezone</Label>
                                        <Select
                                            value={formData.timezone}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, timezone: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timezones.map((tz) => (
                                                    <SelectItem key={tz} value={tz}>
                                                        {tz}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Currency</Label>
                                        <Select
                                            value={formData.currency}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, currency: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {currencies.map((c) => (
                                                    <SelectItem key={c.code} value={c.code}>
                                                        {c.code} - {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) =>
                                                setFormData({ ...formData, phone: e.target.value })
                                            }
                                            placeholder="+94 11 234 5678"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) =>
                                                setFormData({ ...formData, email: e.target.value })
                                            }
                                            placeholder="branch@hotel.com"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={formData.isDefault}
                                        onChange={(e) =>
                                            setFormData({ ...formData, isDefault: e.target.checked })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="isDefault">
                                        Set as default branch (for new rooms)
                                    </Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingBranch ? 'Save Changes' : 'Create Branch'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Branches
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{branches.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Rooms (All Branches)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {branches.reduce((sum, b) => sum + b._count.rooms, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Bookings (All Branches)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {branches.reduce((sum, b) => sum + b._count.bookings, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Branches Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Branches</CardTitle>
                    <CardDescription>
                        Manage branches across different locations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">Loading...</div>
                    ) : branches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No branches yet. Create your first branch to get started.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead>Rooms</TableHead>
                                    <TableHead>Bookings</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {branches.map((branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {branch.name}
                                                    {branch.isDefault && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {branch.code}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {branch.city}, {branch.country}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" />
                                                {branch.currency}
                                            </div>
                                        </TableCell>
                                        <TableCell>{branch._count.rooms}</TableCell>
                                        <TableCell>{branch._count.bookings}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={branch.isActive ? 'default' : 'secondary'}
                                            >
                                                {branch.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(branch)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(branch.id)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
