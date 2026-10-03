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
    Users, Search, RefreshCw, Plus, MapPin, Phone, Mail, Package, Loader2,
    Wallet, CreditCard, ChevronRight, Globe, Building
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion/primitives';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    country: string | null;
    address: string | null;
    wallet?: { balance: number; currency: string };
    _count: { vehicles: number; bids: number };
}

const COUNTRIES = [
    'Sri Lanka', 'Botswana', 'South Africa', 'Kenya', 'Tanzania',
    'Uganda', 'Ghana', 'Nigeria', 'Zambia', 'Zimbabwe', 'New Zealand', 'Other'
];

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        country: 'Sri Lanka',
    });

    const fetchCustomers = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/vehicle-export/customers');
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || []);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleCreate = async () => {
        if (!newCustomer.name || !newCustomer.email) {
            toast.error('Error', { description: 'Name and email are required' });
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/vehicle-export/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer),
            });

            if (res.ok) {
                toast.success('Customer Added', { description: 'New client profile created.' });
                setShowCreateDialog(false);
                setNewCustomer({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    country: 'Sri Lanka',
                });
                fetchCustomers();
            } else {
                toast.error('Error');
            }
        } catch (error) {
            toast.error('Error');
        } finally {
            setCreating(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black p-4 sm:p-8 space-y-6">

            {/* Header */}
            <FadeIn className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Users className="h-8 w-8 text-teal-600" />
                        Client Directory
                    </h1>
                    <p className="text-gray-500 mt-1">Manage global dealer network and private buyers</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search clients..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        />
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
                        <Plus className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Add Client</span>
                    </Button>
                </div>
            </FadeIn>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No customers found</p>
                </div>
            ) : (
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map((customer) => (
                        <StaggerItem key={customer.id}>
                            <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                                <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden relative group">

                                    {/* Top decoration */}
                                    <div className="h-2 w-full bg-gradient-to-r from-teal-500 to-emerald-500" />

                                    <CardContent className="p-6">

                                        {/* Header Profile */}
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-14 w-14 border-2 border-white dark:border-gray-800 shadow-sm">
                                                    <AvatarFallback className="bg-teal-50 text-teal-700 text-lg">
                                                        {customer.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{customer.name}</h3>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <MapPin className="h-3 w-3" /> {customer.country || 'Unknown'}
                                                    </div>
                                                </div>
                                            </div>
                                            {customer.wallet && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-400 mb-0.5">Balance</p>
                                                    <Badge variant={Number(customer.wallet.balance) > 0 ? "default" : "secondary"} className={cn("font-mono", Number(customer.wallet.balance) < 0 && "bg-red-100 text-red-700")}>
                                                        ${Number(customer.wallet.balance).toLocaleString()}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        {/* Details Grid */}
                                        <div className="space-y-3 mb-6">
                                            {customer.company && (
                                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                                                    <Building className="h-4 w-4" />
                                                    <span className="truncate">{customer.company}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                                                <Mail className="h-4 w-4" />
                                                <span className="truncate">{customer.email}</span>
                                            </div>
                                            {customer.phone && (
                                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                                                    <Phone className="h-4 w-4" />
                                                    <span>{customer.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Stats */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-400">Purchases</p>
                                                    <p className="font-bold text-gray-900 dark:text-white">{customer._count.vehicles}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-400">Bids</p>
                                                    <p className="font-bold text-gray-900 dark:text-white">{customer._count.bids}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="hover:bg-teal-50 hover:text-teal-700">
                                                View Profile <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>

                                    </CardContent>
                                </Card>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md bg-white dark:bg-gray-950">
                    <DialogHeader>
                        <DialogTitle>Add New Client</DialogTitle>
                        <DialogDescription>Enter customer details to create profile.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Full Name</Label>
                            <Input value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="John Doe" />
                        </div>
                        <div>
                            <Label>Email Address</Label>
                            <Input value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="client@example.com" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Phone</Label>
                                <Input value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="+123..." />
                            </div>
                            <div>
                                <Label>Country</Label>
                                <Select value={newCustomer.country} onValueChange={v => setNewCustomer({ ...newCustomer, country: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Company (Optional)</Label>
                            <Input value={newCustomer.company} onChange={e => setNewCustomer({ ...newCustomer, company: e.target.value })} placeholder="Auto Trading Ltd" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating} className="bg-teal-600 text-white">
                            {creating ? <Loader2 className="animate-spin" /> : 'Create Profile'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
