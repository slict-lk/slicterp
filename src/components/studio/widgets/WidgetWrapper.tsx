"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface WidgetWrapperProps {
    title: string;
    dataSource: string;
    className?: string;
    children: ReactNode;
}

export function WidgetWrapper({ title, dataSource, className, children }: WidgetWrapperProps) {
    return (
        <Card className={cn("flex flex-col shadow-sm border-slate-200 overflow-hidden h-full", className)}>
            <CardHeader className="py-3 px-4 border-b bg-white flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-sm font-semibold text-slate-800 truncate pr-2">{title}</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-400 border-slate-200 shrink-0">
                    {dataSource}
                </Badge>
            </CardHeader>
            <CardContent className="p-4 flex-1 bg-white flex flex-col justify-center min-h-[120px]">
                {children}
            </CardContent>
        </Card>
    );
}
