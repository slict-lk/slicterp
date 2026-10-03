"use client";

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboard, useUpdateDashboardMutation } from '@/hooks/use-studio';
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
    metrics: string;
}

export default function EditDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const dashboardId = resolvedParams.id;
    const router = useRouter();

    const { data: dashboard, isLoading: isLoadingDashboard } = useDashboard(dashboardId);
    const updateMutation = useUpdateDashboardMutation();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [widgets, setWidgets] = useState<WidgetDraft[]>([]);
    const [initialized, setInitialized] = useState(false);

    // Sync state when data loads (only on first load)
    useEffect(() => {
        if (dashboard && !initialized) {
            setName(dashboard.name);
            setDescription(dashboard.description || '');
            setIsDefault(dashboard.isDefault || false);
            setWidgets(dashboard.widgets?.map((w: any) => ({
                id: w.id,
                title: w.title,
                type: w.type as WidgetType,
                dataSource: w.dataSource,
                chartType: (w.config?.chartType || w.chartType) as ChartType | undefined,
                metrics: (() => {
                    const m = w.config?.metrics || w.metrics;
                    return Array.isArray(m) ? m.join(', ') : (m || '');
                })()
            })) || []);
            setInitialized(true);
        }
    }, [dashboard, initialized]);

    const addWidget = (type: WidgetType = 'metric') => {
        setWidgets([
            ...widgets,
            {
                id: `new-${Date.now()}`,
                title: `New ${type} widget`,
                type,
                dataSource: 'accounting_invoices',
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

        try {
            const mappedWidgets = widgets.map((w, index) => ({
                id: w.id.startsWith('new-') ? undefined : w.id, // backend handles newness
                title: w.title,
                type: w.type,
                dataSource: w.dataSource,
                chartType: w.chartType,
                metrics: w.metrics ? w.metrics.split(',').map(s => s.trim()).filter(Boolean) : []
            }));

            // Preserve or update layout
            const layout = dashboard?.layout || {
                cols: 12,
                items: []
            };

            await updateMutation.mutateAsync({
                id: dashboardId,
                data: {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    isDefault,
                    layout,
                    widgets: mappedWidgets
                }
            });

            toast.success('Dashboard updated successfully');
            router.push(`/studio/dashboards/${dashboardId}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update dashboard');
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

    if (isLoadingDashboard) {
        return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8">
                        <Link href={`/studio/dashboards/${dashboardId}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Dashboard</h1>
                        <p className="text-sm text-slate-500">Refine the data sources and layout for "{name}".</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" asChild>
                        <Link href={`/studio/dashboards/${dashboardId}`}>Cancel</Link>
                    </Button>
                    <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                        {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-base">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
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
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2" onClick={() => addWidget('metric')}>
                                <Info className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">Metric</span>
                            </Button>
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2" onClick={() => addWidget('chart')}>
                                <BarChart3 className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">Chart</span>
                            </Button>
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2" onClick={() => addWidget('table')}>
                                <Table2 className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">Table</span>
                            </Button>
                            <Button variant="outline" className="h-auto flex flex-col items-center py-4 gap-2" onClick={() => addWidget('list')}>
                                <AlignLeft className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-semibold">List</span>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-6 min-h-[600px] flex flex-col gap-4">
                        {widgets.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <p className="text-sm text-slate-500">Canvas is empty. Add widgets to start building.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
                                {widgets.map((widget) => (
                                    <Card key={widget.id} className={cn("group relative border-slate-200 shadow-sm", widget.type === 'chart' || widget.type === 'table' ? 'md:col-span-2' : '')}>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            onClick={() => removeWidget(widget.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                        <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4 px-4">
                                            {getWidgetIcon(widget.type)}
                                            <Input
                                                value={widget.title}
                                                onChange={e => updateWidget(widget.id, 'title', e.target.value)}
                                                className="h-8 font-semibold border-transparent hover:border-slate-200 bg-transparent"
                                            />
                                        </CardHeader>
                                        <CardContent className="px-4 pb-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] text-slate-500 uppercase">Data Source</Label>
                                                    <Select value={widget.dataSource} onValueChange={v => updateWidget(widget.id, 'dataSource', v)}>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="accounting_invoices">Invoices</SelectItem>
                                                            <SelectItem value="sales_orders">Orders</SelectItem>
                                                            <SelectItem value="inventory_products">Products</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {widget.type === 'chart' ? (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] text-slate-500 uppercase">Chart Type</Label>
                                                        <Select value={widget.chartType} onValueChange={v => updateWidget(widget.id, 'chartType', v)}>
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="bar">Bar</SelectItem>
                                                                <SelectItem value="line">Line</SelectItem>
                                                                <SelectItem value="pie">Pie</SelectItem>
                                                                <SelectItem value="area">Area</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] text-slate-500 uppercase">Metrics</Label>
                                                        <Input className="h-8 text-xs" value={widget.metrics} onChange={e => updateWidget(widget.id, 'metrics', e.target.value)} />
                                                    </div>
                                                )}
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
