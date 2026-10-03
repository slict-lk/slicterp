"use client";

import { Table } from "lucide-react";

interface TableWidgetProps {
    data: any;
}

export function TableWidget({ data }: TableWidgetProps) {
    const listData = Array.isArray(data) ? data : (data?.items || data?.data || [data].filter(Boolean));

    return (
        <div className="h-full w-full overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
                {listData.length === 0 ? (
                    <div className="text-xs text-slate-400 p-8 text-center border border-dashed rounded italic">No records found</div>
                ) : (
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="border-b text-slate-400 font-medium bg-slate-50/50">
                                <th className="py-2 px-2">Label</th>
                                <th className="py-2 px-2 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listData.slice(0, 5).map((item: any, i: number) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="py-2 px-2 font-medium truncate max-w-[120px]">
                                        {item.name || item.title || item.label || `Record ${i + 1}`}
                                    </td>
                                    <td className="py-2 px-2 text-right font-mono text-slate-500">
                                        {item.amount ?? item.status ?? item.value ?? '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
