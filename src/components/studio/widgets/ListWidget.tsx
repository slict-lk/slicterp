"use client";

import { ListChecks } from "lucide-react";

interface ListWidgetProps {
    data: any;
}

export function ListWidget({ data }: ListWidgetProps) {
    const listData = Array.isArray(data) ? data : (data?.items || data?.data || [data].filter(Boolean));

    return (
        <div className="space-y-2">
            {listData.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 text-center">Empty list</div>
            ) : (
                listData.slice(0, 4).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <ListChecks className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-700 truncate">
                                {item.name || item.title || item.id}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                                {item.description || item.subtitle || 'System record'}
                            </p>
                        </div>
                        {item.status && (
                            <div className="px-1.5 py-0.5 rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 uppercase">
                                {item.status}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
