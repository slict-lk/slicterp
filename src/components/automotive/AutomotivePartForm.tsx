'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Wrench, Grid, List, Search, Save, Loader2, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { automotivePartSchema, type AutomotivePartFormValues } from '@/lib/validations/automotive';
import { createAutomotivePart } from '@/lib/actions/automotive';

interface AutomotivePartFormProps {
    vehicles?: any[];
}

export function AutomotivePartForm({ vehicles = [] }: AutomotivePartFormProps) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isPending, startTransition] = useTransition();
    
    // Local state for demo/instant feedback
    const [recentItems, setRecentItems] = useState([
        { sku: '6203-2RS', name: 'Ball Bearing', brand: 'KOYO', time: '10:42 AM', price: 1250 },
        { sku: '1NZ-FE-OIL', name: 'Oil Filter', brand: 'TOYOTA', time: '10:15 AM', price: 3500 },
    ]);

    const form = useForm<AutomotivePartFormValues>({
        resolver: zodResolver(automotivePartSchema),
        defaultValues: {
            partType: 'SPARE_PART',
            condition: 'NEW',
            vehicleModels: [],
            salePrice: 0,
            costPrice: 0,
            stockQty: 0,
            minStockQty: 0,
        },
    });

    const onSubmit = (data: AutomotivePartFormValues) => {
        startTransition(async () => {
            const result = await createAutomotivePart(data);

            if (result.success) {
                toast.success("Success", { description: `Part ${data.sku} created successfully.` });

                setRecentItems((prev) => [
                    {
                        sku: data.sku,
                        name: data.name,
                        brand: data.brandOrigin || 'Unknown',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        price: data.salePrice
                    },
                    ...prev
                ]);

                form.reset();
            } else {
                toast.error("Error", { description: result.message });
            }
        });
    };

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4 p-4 bg-slate-50/50">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="bg-white border-l-4 border-blue-500 shadow-sm rounded-r-md px-4 py-3 mb-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-1.5 rounded-full">
                            <Save className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                            LAST SAVED: <span className="font-bold text-slate-900">{recentItems[0]?.sku}</span> - {recentItems[0]?.name}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{recentItems[0]?.time}</span>
                </div>

                <ScrollArea className="flex-1 pr-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-10">

                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b bg-slate-50/40">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-slate-500" />
                                        Part Identity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <FormField
                                        control={form.control}
                                        name="sku"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Part Number / SKU <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 6203-2RS" className="font-mono" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Part Name <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Deep Groove Ball Bearing" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="oemCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>OEM Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Original Manufacturer Code" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="interchangeNumbers"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cross Reference / Interchange</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Alternative Part Numbers" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">Comma separated values</FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b bg-slate-50/40">
                                        <CardTitle className="text-base font-semibold">Classification</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <FormField
                                            control={form.control}
                                            name="partType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Part Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="SPARE_PART">Spare Part</SelectItem>
                                                            <SelectItem value="BEARING">Bearing</SelectItem>
                                                            <SelectItem value="LUBRICANT">Lubricant</SelectItem>
                                                            <SelectItem value="ACCESSORY">Accessory</SelectItem>
                                                            <SelectItem value="TOOL">Tool</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="condition"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Condition</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Condition" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="NEW">Brand New</SelectItem>
                                                                <SelectItem value="USED">Used / Reconditioned</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="brandOrigin"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Origin</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. JAPAN" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b bg-slate-50/40">
                                        <CardTitle className="text-base font-semibold">Pricing & Stock</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="costPrice"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Cost Price</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="salePrice"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Selling Price</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" className="font-bold text-blue-600" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="stockQty"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Initial Stock</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="rackLocation"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Rack / Bin</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. A-12" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b bg-slate-50/40">
                                    <CardTitle className="text-base font-semibold">Technical Specifications</CardTitle>
                                    <CardDescription>Dimensions and Fitment</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <FormField
                                        control={form.control}
                                        name="vehicleModels"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Vehicle Compatibility</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full justify-between",
                                                                    !field.value || field.value.length === 0 && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value && field.value.length > 0
                                                                    ? `${field.value.length} vehicles selected`
                                                                    : "Select compatible vehicles"}
                                                                <Wrench className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center border-b px-3 py-2">
                                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                <Input
                                                                    placeholder="Search vehicle..."
                                                                    className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                                />
                                                            </div>
                                                            <div className="max-h-64 overflow-y-auto p-1">
                                                                {vehicles.map((vehicle) => {
                                                                    const label = `${vehicle.make} ${vehicle.model} (${vehicle.yearStart}-${vehicle.yearEnd || 'Present'})`;
                                                                    const isSelected = (field.value || []).includes(label);
                                                                    return (
                                                                        <button
                                                                            key={vehicle.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const current = field.value || [];
                                                                                if (isSelected) {
                                                                                    form.setValue('vehicleModels', current.filter((v: string) => v !== label));
                                                                                } else {
                                                                                    form.setValue('vehicleModels', [...current, label]);
                                                                                }
                                                                            }}
                                                                            className={cn(
                                                                                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                                                                "hover:bg-slate-100 dark:hover:bg-slate-800",
                                                                                isSelected && "bg-slate-100 dark:bg-slate-800"
                                                                            )}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    isSelected ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormDescription>
                                                    Select all standard models this part fits.
                                                </FormDescription>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {(field.value || []).map((val: string, i: number) => (
                                                        <Badge key={i} variant="secondary" className="text-xs">
                                                            {val}
                                                            <button
                                                                type="button"
                                                                className="ml-1 hover:text-red-500"
                                                                onClick={() => {
                                                                    form.setValue('vehicleModels', field.value.filter((v: string) => v !== val));
                                                                }}
                                                            >×</button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-3 gap-4 mb-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="innerDiameter"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Inner Ø (d)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="mm" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="outerDiameter"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Outer Ø (D)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="mm" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="width"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Width (B)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="mm" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="remarks"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Remarks / Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Condition details, compatibility notes..." {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    'Save Assessment'
                                )}
                            </Button>
                        </form>
                    </Form>
                </ScrollArea>
            </div>

            <div className="w-[380px] border-l pl-4 hidden xl:block flex flex-col">
                <div className="sticky top-0 bg-slate-50/50 pt-1 pb-4 z-10 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">Recent Parts</h3>
                        <div className="flex bg-slate-200 rounded p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search parts..." className="pl-9 bg-white" />
                    </div>
                </div>

                <ScrollArea className="flex-1 -mr-4 pr-4">
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
                        {recentItems.map((item, idx) => (
                            viewMode === 'grid' ? (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="font-mono text-[10px]">{item.sku}</Badge>
                                        <span className="text-[10px] text-slate-400">{item.time}</span>
                                    </div>
                                    <div className="font-medium text-sm text-slate-800 line-clamp-2 leading-tight mb-2">{item.name}</div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-slate-500">{item.brand}</span>
                                        <span className="font-bold text-blue-600">Rs. {item.price}</span>
                                    </div>
                                </div>
                            ) : (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-sm text-slate-800">{item.sku}</span>
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1">{item.brand}</Badge>
                                        </div>
                                        <div className="text-xs text-slate-500">{item.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm text-blue-600">Rs. {item.price}</div>
                                        <div className="text-[10px] text-slate-400">{item.time}</div>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
