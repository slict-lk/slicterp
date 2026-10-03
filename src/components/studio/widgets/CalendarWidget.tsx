"use client";

import { Calendar as CalendarIcon } from "lucide-react";

interface CalendarWidgetProps {
    data: any;
}

export function CalendarWidget({ data }: CalendarWidgetProps) {
    const listData = Array.isArray(data) ? data : (data?.items || data?.data || [data].filter(Boolean));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1 opacity-40">
                {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="h-3 w-full bg-slate-100 rounded-sm"></div>
                ))}
            </div>
            <div className="space-y-2">
                {listData.length > 0 ? (
                    listData.slice(0, 2).map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                            <div className="p-1 bg-indigo-50 rounded border border-indigo-100">
                                <CalendarIcon className="h-3 w-3 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-700 truncate">{String(item.name ?? item.title ?? 'Event')}</p>
                                <p className="text-[9px] text-slate-400">{item.date ? new Date(item.date).toLocaleDateString() : 'Today'}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-[10px] text-slate-400 italic text-center">No upcoming events</p>
                )}
            </div>
        </div>
    );
}
