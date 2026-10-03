"use client";

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useModule, useCreateRecordMutation } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Database, Loader2 } from 'lucide-react';
import { DynamicForm } from '@/components/studio/DynamicForm';
import { toast } from 'sonner';

export default function NewRecordPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const moduleId = resolvedParams.id;
    const router = useRouter();

    const { data: moduleData, isLoading } = useModule(moduleId);
    const createMutation = useCreateRecordMutation(moduleId);

    const handleSubmit = async (data: any) => {
        try {
            await createMutation.mutateAsync(data);
            toast.success('Record created successfully');
            router.push(`/studio/modules/${moduleId}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create record');
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    if (!moduleData) {
        return <div className="p-8 text-center text-slate-500">Module not found</div>;
    }

    const fields = moduleData.schema?.fields || [];

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8">
                    <Link href={`/studio/modules/${moduleId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">New {moduleData.name} Record</h1>
                    <p className="text-sm text-slate-500">Fill out the fields below to create a new entry.</p>
                </div>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                            <Database className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Record Details</CardTitle>
                            <CardDescription>
                                Fields marked with <span className="text-red-500">*</span> are required.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <DynamicForm
                        fields={fields as any}
                        onSubmit={handleSubmit}
                        isLoading={createMutation.isPending}
                        submitLabel="Create Record"
                        onCancel={() => router.push(`/studio/modules/${moduleId}`)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
