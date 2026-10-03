"use client";

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useModule, useRecord, useUpdateRecordMutation } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Database, Loader2, Edit3 } from 'lucide-react';
import { DynamicForm } from '@/components/studio/DynamicForm';
import { toast } from 'sonner';

export default function EditRecordPage({ params }: { params: Promise<{ id: string, recordId: string }> }) {
    const resolvedParams = use(params);
    const { id: moduleId, recordId } = resolvedParams;
    const router = useRouter();

    const { data: moduleData, isLoading: loadingModule } = useModule(moduleId);
    const { data: recordData, isLoading: loadingRecord } = useRecord(moduleId, recordId);

    const updateMutation = useUpdateRecordMutation(moduleId, recordId);

    const handleSubmit = async (data: any) => {
        try {
            await updateMutation.mutateAsync(data);
            toast.success('Record updated successfully');
            router.push(`/studio/modules/${moduleId}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update record');
        }
    };

    if (loadingModule || loadingRecord) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    if (!moduleData || !recordData) {
        return <div className="p-8 text-center text-slate-500">Record or Module not found</div>;
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
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit {moduleData.name} Record</h1>
                    <p className="text-sm text-slate-500">Update the fields for this entry.</p>
                </div>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                            <Edit3 className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Record Data</CardTitle>
                            <CardDescription>
                                Fields marked with <span className="text-red-500">*</span> are required.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <DynamicForm
                        fields={fields as any}
                        defaultValues={recordData.data || {}}
                        onSubmit={handleSubmit}
                        isLoading={updateMutation.isPending}
                        submitLabel="Update Record"
                        onCancel={() => router.push(`/studio/modules/${moduleId}`)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
