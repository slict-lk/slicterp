"use client";

import { ErrorBoundary } from 'react-error-boundary';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function ErrorFallback({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: () => void }) {
    return (
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-3 pb-2 border-b border-red-100">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <AlertCircle className="h-4 w-4" />
                </div>
                <CardTitle className="text-red-800 text-sm font-semibold">Failed to load component</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="text-xs text-red-600 font-mono bg-white/50 p-2 rounded border border-red-100 overflow-auto max-h-32">
                    {error.message || 'Unknown render error occurred in Studio.'}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={resetErrorBoundary}
                    className="border-red-200 text-red-700 hover:bg-red-100"
                >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Try Again
                </Button>
            </CardContent>
        </Card>
    );
}

export function StudioErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            {children}
        </ErrorBoundary>
    );
}
