'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Plus } from 'lucide-react';

export default function QualityChecksPage() {
    const [checks, setChecks] = useState([]);

    useEffect(() => {
        const fetchChecks = async () => {
            try {
                const res = await fetch('/api/quality/checks');
                if (res.ok) {
                    const data = await res.json();
                    setChecks(data);
                }
            } catch (error) {
                console.error('Failed to fetch checks:', error);
            }
        };
        fetchChecks();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quality Checks</h1>
                    <p className="text-gray-600">Monitor quality control checkpoints</p>
                </div>
                <Button><Plus className="h-4 w-4 mr-2" />New Check</Button>
            </div>
            <div className="grid gap-4">
                {checks.map((check: any) => (
                    <Card key={check.id}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                    <div>
                                        <h3 className="font-semibold">{check.name}</h3>
                                        <p className="text-sm text-gray-500">{check.description}</p>
                                    </div>
                                </div>
                                <Badge>{check.status}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
