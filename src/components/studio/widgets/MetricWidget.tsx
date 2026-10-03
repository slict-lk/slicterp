"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricWidgetProps {
    data: any;
    title: string;
}

export function MetricWidget({ data, title }: MetricWidgetProps) {
    const count = typeof data === 'number' ? data : (data?.count ?? data?.total ?? data?.length ?? 0);
    const trend = data?.trend ?? 0;
    const isPositive = trend >= 0;

    return (
        <div className="flex flex-col h-full justify-center">
            {title && <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</div>}
            <div className="text-3xl font-bold text-slate-900">{count.toLocaleString()}</div>
            <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{isPositive ? '+' : ''}{trend}% from last period</span>
            </div>
        </div>
    );
}
