"use client";

import { BarChart3, LineChart, PieChart, AreaChart } from "lucide-react";

interface ChartWidgetProps {
    data: any;
    chartType?: 'line' | 'bar' | 'pie' | 'area';
}

export function ChartWidget({ data, chartType = 'bar' }: ChartWidgetProps) {
    const Icon = {
        line: LineChart,
        bar: BarChart3,
        pie: PieChart,
        area: AreaChart
    }[chartType] || BarChart3;

    return (
        <div className="flex flex-col h-full w-full items-center justify-center min-h-[160px] bg-slate-50/50 rounded-md border border-slate-100 p-4">
            <Icon className="h-8 w-8 text-indigo-300 mb-2" />
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{chartType} chart</p>
            <p className="text-[10px] text-slate-400 mt-1">
                {Array.isArray(data) ? `Processing ${data.length} data points` : 'Live visualization active'}
            </p>

            {/* Chart mock visualization */}
            <div className="mt-4 flex items-end gap-1.5 h-12 w-full justify-center opacity-40">
                {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                    <div key={i} className="bg-indigo-400 w-full rounded-t-sm" style={{ height: `${h}%` }}></div>
                ))}
            </div>
        </div>
    );
}
