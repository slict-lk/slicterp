'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Car, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { vehicleSchema, type VehicleFormValues } from '@/lib/validations/automotive';
import { createVehicle, deleteVehicle } from '@/lib/actions/vehicle';

interface VehicleManagerProps {
    initialVehicles: any[];
}

export function VehicleManager({ initialVehicles }: VehicleManagerProps) {
    const [vehicles, setVehicles] = useState(initialVehicles);
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    
    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: {
            make: '',
            model: '',
            yearStart: new Date().getFullYear(),
            engine: '',
        },
    });

    const onSubmit = (data: VehicleFormValues) => {
        startTransition(async () => {
            const result = await createVehicle(data);
            if (result.success) {
                setVehicles(prev => [...prev, result.vehicle]);
                setIsOpen(false);
                form.reset();
                toast.success('Success', { description: 'Vehicle added successfully' });
            } else {
                toast.error('Error', { description: result.message });
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm('Are you sure?')) return;
        startTransition(async () => {
            const result = await deleteVehicle(id);
            if (result.success) {
                setVehicles(prev => prev.filter(v => v.id !== id));
                toast.success('Deleted', { description: 'Vehicle removed' });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Vehicle Database</h2>
                    <p className="text-muted-foreground">Manage vehicle makes, models, and compatibility.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Vehicle</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Vehicle</DialogTitle>
                            <DialogDescription>Add a vehicle model to the database for part fitment.</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="make"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Make</FormLabel>
                                                <FormControl><Input placeholder="Toyota" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="model"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Model</FormLabel>
                                                <FormControl><Input placeholder="Corolla" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="yearStart"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Year Start</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="yearEnd"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Year End (Optional)</FormLabel>
                                                <FormControl><Input type="number" placeholder="Present" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.valueAsNumber || undefined)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="engine"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Engine Code (Optional)</FormLabel>
                                            <FormControl><Input placeholder="1NZ-FE" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Vehicle
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Models</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vehicles.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Vehicles</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Make</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Years</TableHead>
                                <TableHead>Engine</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No vehicles found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                vehicles.map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium">{v.make}</TableCell>
                                        <TableCell>{v.model}</TableCell>
                                        <TableCell>{v.yearStart} - {v.yearEnd || 'Present'}</TableCell>
                                        <TableCell>{v.engine || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
