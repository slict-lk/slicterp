"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ArrowLeft, LayoutTemplate, Save, Plus, Trash2, BarChart3,
    LineChart, PieChart, Info, Table2, AlignLeft, CalendarClock, Loader2
} from 'lucide-react';

type WidgetType = 'chart' | 'metric' | 'table' | 'list' | 'calendar';
type ChartType = 'line' | 'bar' | 'pie' | 'area';

interface WidgetDraft {
    id: string;
    title: string;
    type: WidgetType;
    dataSource: string;
    chartType?: ChartType;
    metrics: string; // comma separated string for drafting
}

import { useCreateDashboardMutation } from '@/hooks/use-studio';

export default function NewDashboardPage() {
    const router = useRouter();
    const createMutation = useCreateDashboardMutation();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [widgets, setWidgets] = useState<WidgetDraft[]>([]);

    const addWidget = (type: WidgetType = 'metric') => {
        setWidgets([
            ...widgets,
            {
                id: Date.now().toString(),
                title: `New ${type} widget`,
                type,
                dataSource: 'accounting_invoices', // Default placeholder
                chartType: type === 'chart' ? 'bar' : undefined,
                metrics: ''
            }
        ]);
    };

    const updateWidget = (id: string, key: keyof WidgetDraft, value: any) => {
        setWidgets(widgets.map(w => w.id === id ? { ...w, [key]: value } : w));
    };

    const removeWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error('Dashboard name is required');
            return;
        }

        if (widgets.length === 0) {
            toast.error('Add at least one widget to the dashboard');
            return;
        }

        try {
            // Map to correct payload
            const mappedWidgets = widgets.map((w, index) => ({
                ...w,
                metrics: w.metrics ? w.metrics.split(',').map(s => s.trim()).filter(Boolean) : []
            }));

            // Generate a column-aware layout with proper y stacking
            const layout = {
                cols: 12,
                rows: 0,
                items: [] as Array<{ widgetId: string; x: number; y: number; w: number; h: number }>,
            };
            let colY = [0, 0]; // Track y per column (2 columns)
            mappedWidgets.forEach((w, idx) => {
                const h = w.type === 'chart' || w.type === 'table' ? 4 : 2;
                if (w.type === 'chart' || w.type === 'table') {
                    const y = Math.max(colY[0], colY[1]);
                    layout.items.push({ widgetId: w.id, x: 0, y, w: 12, h });
                    colY[0] = y + h;
                    colY[1] = y + h;
                } else {
                    const col = idx % 2;
                    layout.items.push({ widgetId: w.id, x: col * 6, y: colY[col], w: 6, h });
                    colY[col] += h;
                }
            });
            layout.rows = Math.max(1, ...colY);

            await createMutation.mutateAsync({
                name: name.trim(),
                description: description.trim() || undefined,
                isDefault,
                layout,
                widgets: mappedWidgets
            });

            toast.success('Dashboard created successfully');
            router.push(`/studio/dashboards`);

        } catch (err: any) {
            toast.error(err.message || 'Failed to create dashboard');
        }
    };


    const getWidgetIcon = (type: WidgetType) => {
        switch (type) {
            case 'metric': return <Info className="h-5 w-5 text-blue-500" />;
            case 'chart': return <BarChart3 className="h-5 w-5 text-purple-500" />;
            case 'table': return <Table2 className="h-5 w-5 text-emerald-500" />;
            case 'list': return <AlignLeft className="h-5 w-5 text-amber-500" />;
            case 'calendar': return <CalendarClock className="h-5 w-5 text-rose-500" />;
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8">
                        <Link href="/studio/dashboards">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Builder</h1>
                        <p className="text-sm text-slate-500">Configure layout and data widgets for realtime analytics.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/studio/dashboards">Cancel</Link>
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                        {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Dashboard
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column - Meta & Palette */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-base">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Sales Overview"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Textarea
                                    id="desc"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="What is this dashboard for?"
                                    rows={2}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div className="space-y-0.5">
                                    <Label>Default Dashboard</Label>
                                    <p className="text-xs text-slate-500">Show this as the primary view.</p>
                                </div>
                                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-base">Widget Palette</CardTitle>
                            <CardDescription>Click to add to your canvas.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors" onClick={() => addWidget('metric')}>
                                <Info className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">Metric</span>
                            </Button>
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors" onClick={() => addWidget('chart')}>
                                <BarChart3 className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">Chart</span>
                            </Button>
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors" onClick={() => addWidget('table')}>
                                <Table2 className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">Data Table</span>
                            </Button>
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors" onClick={() => addWidget('list')}>
                                <AlignLeft className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">Recent List</span>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Canvas */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-6 min-h-[600px] flex flex-col gap-4">

                        {widgets.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="h-16 w-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                    <LayoutTemplate className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-1">Canvas is empty</h3>
                                <p className="text-sm text-slate-500 max-w-sm">
                                    Add widgets from the palette on the left to start building your dashboard layout.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
                                {widgets.map((widget) => (
                                    <Card key={widget.id} className={cn("group relative border-slate-200 shadow-sm transition-all", widget.type === 'chart' || widget.type === 'table' ? 'md:col-span-2' : '')}>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
                                            onClick={() => removeWidget(widget.id)}
                                            aria-label={`Remove ${widget.title} widget`}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                        <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4 px-4">
                                            {getWidgetIcon(widget.type)}
                                            <Input
                                                value={widget.title}
                                                onChange={e => updateWidget(widget.id, 'title', e.target.value)}
                                                className="h-8 font-semibold border-transparent hover:border-slate-200 focus:border-indigo-500 px-2 -ml-2 bg-transparent"
                                            />
                                        </CardHeader>
                                        <CardContent className="px-4 pb-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-slate-500 font-semibold uppercase">Data Source</Label>
                                                    <Select value={widget.dataSource} onValueChange={v => updateWidget(widget.id, 'dataSource', v)}>
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue placeholder="Select Source" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="accounting_invoices">Accounting: Invoices</SelectItem>
                                                            <SelectItem value="sales_orders">Sales: Orders</SelectItem>
                                                            <SelectItem value="inventory_products">Inventory: Products</SelectItem>
                                                            <SelectItem value="crm_leads">CRM: Leads</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {widget.type === 'chart' ? (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-slate-500 font-semibold uppercase">Chart Type</Label>
                                                        <Select value={widget.chartType} onValueChange={v => updateWidget(widget.id, 'chartType', v as ChartType)}>
                                                            <SelectTrigger className="h-8 text-sm">
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="bar">Bar Chart</SelectItem>
                                                                <SelectItem value="line">Line Chart</SelectItem>
                                                                <SelectItem value="pie">Pie Chart</SelectItem>
                                                                <SelectItem value="area">Area Chart</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-slate-500 font-semibold uppercase">Metrics</Label>
                                                        <Input
                                                            placeholder="e.g. count, sum(total)"
                                                            className="h-8 text-sm"
                                                            value={widget.metrics}
                                                            onChange={e => updateWidget(widget.id, 'metrics', e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Visual Placeholder */}
                                            <div className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-md h-24 flex items-center justify-center">
                                                <span className="text-xs text-slate-400 font-medium">Renderer Preview</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
