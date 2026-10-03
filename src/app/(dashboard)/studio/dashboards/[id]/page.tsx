"use client";

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { WidgetWrapper } from '@/components/studio/widgets/WidgetWrapper';
import { MetricWidget } from '@/components/studio/widgets/MetricWidget';
import { ChartWidget } from '@/components/studio/widgets/ChartWidget';
import { TableWidget } from '@/components/studio/widgets/TableWidget';
import { ListWidget } from '@/components/studio/widgets/ListWidget';
import { CalendarWidget } from '@/components/studio/widgets/CalendarWidget';

interface WidgetDataProps {
    widget: any;
}

// Reusable Live Widget Renderer
function LiveWidget({ widget }: WidgetDataProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const metrics = widget.config?.metrics || widget.metrics;
    const chartType = widget.config?.chartType || widget.chartType;
    const metricsKey = useMemo(() => JSON.stringify(metrics), [metrics]);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch('/api/studio/data-sources/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        connectorId: widget.dataSource,
                        config: { metrics }
                    }),
                    signal: controller.signal,
                });

                if (!res.ok) throw new Error('Data connector failed');
                const json = await res.json();
                if (mounted) setData(json.data);
            } catch (err: any) {
                if (mounted && err.name !== 'AbortError') setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
        return () => { mounted = false; controller.abort(); };
    }, [widget.dataSource, metricsKey]);

    if (loading) {
        return (
            <div className="h-full w-full min-h-[120px] flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="h-full w-full min-h-[120px] flex flex-col items-center justify-center p-4 text-center bg-red-50/5 rounded-md border border-dashed border-red-200">
                <AlertCircle className="h-5 w-5 text-red-400 mb-2" />
                <p className="text-xs text-red-600 font-medium">Data source unavailable</p>
                <p className="text-[10px] text-red-400 truncate w-full">{widget.dataSource}</p>
            </div>
        );
    }

    switch (widget.type) {
        case 'metric': return <MetricWidget data={data} title={widget.title} />;
        case 'chart': return <ChartWidget data={data} chartType={chartType} />;
        case 'table': return <TableWidget data={data} />;
        case 'list': return <ListWidget data={data} />;
        case 'calendar': return <CalendarWidget data={data} />;
        default: return <div className="text-xs text-slate-500">Visualization pending</div>;
    }
}

export default function DashboardViewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const dashboardId = resolvedParams.id;
    const { data: dashboard, isLoading, refetch } = useDashboard(dashboardId);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    if (!dashboard) {
        return <div className="p-8 text-center text-slate-500">Dashboard not found</div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8">
                        <Link href="/studio/dashboards">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{dashboard.name}</h1>
                            {dashboard.isDefault && (
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">Default View</Badge>
                            )}
                        </div>
                        {dashboard.description && (
                            <p className="text-sm text-slate-500">{dashboard.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button size="sm" asChild>
                        <Link href={`/studio/dashboards/${dashboardId}/edit`}>Edit Layout</Link>
                    </Button>
                </div>
            </div>

            {/* Grid Layout Canvas */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 md:p-6 min-h-[500px]">
                {!dashboard.widgets?.length ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 p-20">
                        <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-sm">This dashboard has no widgets configured.</p>
                        <Button variant="link" asChild className="mt-2">
                            <Link href={`/studio/dashboards/${dashboardId}/edit`}>Add Widgets</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6 auto-rows-max">
                        {dashboard.widgets.map((widget: any, index: number) => {
                            // Extract layout if available, otherwise fallback to standard grid flow
                            const layoutItem = dashboard.layout?.items?.find((i: any) => i.widgetId === widget.id);

                            // Tailwind cannot generate dynamic class names from template strings.
                            // Use a static mapping instead.
                            const colSpanMap: Record<number, string> = {
                                1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3',
                                4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6',
                                7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9',
                                10: 'lg:col-span-10', 11: 'lg:col-span-11', 12: 'lg:col-span-12',
                            };

                            const spanClass = layoutItem
                                ? (colSpanMap[layoutItem.w] || 'lg:col-span-6')
                                : (widget.type === 'chart' || widget.type === 'table' ? 'lg:col-span-6 md:col-span-2' : 'lg:col-span-3');

                            return (
                                <WidgetWrapper
                                    key={widget.id}
                                    title={widget.title}
                                    dataSource={widget.dataSource}
                                    className={spanClass}
                                >
                                    <LiveWidget widget={widget} />
                                </WidgetWrapper>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
