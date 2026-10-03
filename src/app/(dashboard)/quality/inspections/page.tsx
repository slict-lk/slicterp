'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Plus } from 'lucide-react';

export default function InspectionsPage() {
    const [inspections, setInspections] = useState([]);

    useEffect(() => {
        const fetchInspections = async () => {
            try {
                const res = await fetch('/api/quality/inspections');
                if (res.ok) {
                    const data = await res.json();
                    setInspections(data.inspections || []);
                }
            } catch (error) {
                console.error('Failed to fetch inspections:', error);
            }
        };
        fetchInspections();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quality Inspections</h1>
                    <p className="text-gray-600">Detailed quality inspection records</p>
                </div>
                <Button><Plus className="h-4 w-4 mr-2" />New Inspection</Button>
            </div>
            <div className="grid gap-4">
                {inspections.map((inspection: any) => (
                    <Card key={inspection.id}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4">
                                    <ClipboardCheck className="h-8 w-8 text-blue-600" />
                                    <div>
                                        <h3 className="font-semibold">{inspection.product}</h3>
                                        <p className="text-sm text-gray-500">Inspector: {inspection.inspector}</p>
                                    </div>
                                </div>
                                <Badge>{inspection.result}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
