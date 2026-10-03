"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugPage() {
    const { data: session, status } = useSession();

    return (
        <div className="p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Session Debugger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <strong>Status:</strong> {status}
                    </div>
                    <pre className="bg-slate-950 text-white p-4 rounded-lg overflow-auto">
                        {JSON.stringify(session, null, 2)}
                    </pre>
                    <div className="text-sm text-muted-foreground mt-4">
                        <p>Check if <strong>tenantId</strong> matches your expectation.</p>
                        <p>Expected Tenant (SLICT): cmivuqa8z0000epwfkvvn28mi</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
