import { Card, CardHeader, CardContent } from '@/components/ui/card';

export function StudioCardSkeleton() {
    return (
        <Card className="border-border/50 animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
            </CardHeader>
            <CardContent>
                <div className="h-8 w-12 bg-slate-200 rounded mb-2 mt-2"></div>
                <div className="h-3 w-32 bg-slate-100 rounded"></div>
            </CardContent>
        </Card>
    );
}

export function StudioTableSkeleton() {
    return (
        <div className="border border-slate-100 rounded-lg animate-pulse">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="h-8 w-64 bg-slate-200 rounded"></div>
                <div className="h-8 w-24 bg-slate-200 rounded"></div>
            </div>
            <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="h-4 w-1/4 bg-slate-100 rounded"></div>
                        <div className="h-4 w-1/4 bg-slate-100 rounded"></div>
                        <div className="h-4 w-1/4 bg-slate-100 rounded"></div>
                        <div className="h-8 w-8 bg-slate-100 rounded-full"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
