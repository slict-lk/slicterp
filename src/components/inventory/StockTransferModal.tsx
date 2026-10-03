'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface StockTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function StockTransferModal({ isOpen, onClose, onSuccess }: StockTransferModalProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [productId, setProductId] = useState('');
    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadDependencies();
            // Reset form
            setProductId('');
            setFromWarehouseId('');
            setToWarehouseId('');
            setQuantity('');
            setNotes('');
        }
    }, [isOpen]);

    const loadDependencies = async () => {
        try {
            const [prodRes, whRes] = await Promise.all([
                fetch('/api/inventory/products'),
                fetch('/api/inventory/warehouses')
            ]);
            if (prodRes.ok) {
                const prodData = await prodRes.json();
                setProducts(prodData.data || prodData);
            } else {
                toast.error('Failed to load products');
            }
            if (whRes.ok) {
                setWarehouses(await whRes.json());
            } else {
                toast.error('Failed to load warehouses');
            }
        } catch (error) {
            console.error('Failed to load dependencies', error);
            toast.error('Could not load form data. Please close and try again.');
        }
    };

    const handleSubmit = async () => {
        if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
            toast.error('Please fill out all required fields.');
            return;
        }

        const numQuantity = Number(quantity);
        if (!Number.isFinite(numQuantity) || numQuantity <= 0) {
            toast.error('Quantity must be a positive number.');
            return;
        }

        if (fromWarehouseId === toWarehouseId) {
            toast.error('Source and destination warehouses cannot be the same.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/inventory/stock/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    fromWarehouseId,
                    toWarehouseId,
                    quantity: Number(quantity),
                    notes
                })
            });

            if (res.ok) {
                toast.success('Stock transferred successfully');
                onSuccess();
                onClose();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to transfer stock');
            }
        } catch (e) {
            console.error(e);
            toast.error('A network error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Transfer Stock</DialogTitle>
                    <DialogDescription>
                        Move inventory between different warehouse facilities. This will be recorded in the audit log.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Product / Asset <span className="text-rose-500">*</span></Label>
                        <Select value={productId} onValueChange={setProductId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select product to transfer..." />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>From Facility <span className="text-rose-500">*</span></Label>
                            <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Source..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>To Facility <span className="text-rose-500">*</span></Label>
                            <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Destination..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Transfer Quantity <span className="text-rose-500">*</span></Label>
                        <Input
                            type="number"
                            min="1"
                            placeholder="e.g. 20"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Reason / Notes</Label>
                        <Textarea
                            placeholder="Optional notes for the audit trail..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                        {isSubmitting ? 'Processing...' : 'Execute Transfer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
