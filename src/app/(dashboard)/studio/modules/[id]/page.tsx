"use client";

import { useState, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useModule, useRecords, useModuleFields, useDeleteRecordMutation, useDeleteModuleMutation } from '@/hooks/use-studio';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    ArrowLeft, Plus, Search, MoreHorizontal, Settings, Database,
    Code, Download, Upload, Loader2, Trash2, Edit
} from 'lucide-react';
import { format } from 'date-fns';

export default function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const moduleId = resolvedParams.id;
    const router = useRouter();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('records');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isDeletingModule, setIsDeletingModule] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: moduleData, isLoading: loadingModule } = useModule(moduleId);
    const { data: recordsData, isLoading: loadingRecords } = useRecords(moduleId, { search: searchQuery });
    const { data: dbFields, isLoading: loadingFields } = useModuleFields(moduleId);

    // Use DB fields if they have user-defined (non-system) fields, otherwise fallback to schema.fields
    const hasUserDbFields = dbFields?.some((f: any) => !f.isSystem);
    const schemaFields = moduleData?.schema?.fields?.map((f: any, i: number) => ({ id: `schema-${i}`, ...f })) || [];
    const fieldsData = hasUserDbFields ? dbFields! : schemaFields;
    const deleteMutation = useDeleteRecordMutation(moduleId);
    const deleteModuleMutation = useDeleteModuleMutation();

    const handleDeleteModule = async () => {
        if (!confirm(`Are you sure you want to delete "${moduleData?.name}"? All records will be permanently removed.`)) return;
        setIsDeletingModule(true);
        try {
            await deleteModuleMutation.mutateAsync(moduleId);
            toast.success('Module deleted successfully');
            router.push('/studio/modules');
        } catch (err: any) {
            toast.error('Failed to delete module: ' + err.message);
            setIsDeletingModule(false);
        }
    };

    const handleImportCSV = async () => {
        if (!importFile) {
            toast.error('Please select a CSV file first');
            return;
        }
        setIsImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            const res = await fetch(`/api/studio/modules/${moduleId}/records/import`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Import failed');
            }
            const result = await res.json();
            toast.success(`Imported ${result.data?.count ?? 0} records successfully`);
            setImportFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            queryClient.invalidateQueries({ queryKey: ['studio', 'modules', moduleId, 'records'] });
            setActiveTab('records');
        } catch (err: any) {
            toast.error('Import failed: ' + err.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await deleteMutation.mutateAsync(recordId);
            toast.success('Record deleted successfully');
        } catch (err: any) {
            toast.error('Failed to delete record: ' + err.message);
        }
    };

    const fileUrlPrefix = "https://"; // placeholder for file field formatting

    if (loadingModule) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    if (!moduleData) {
        return <div className="p-8 text-center text-slate-500">Module not found</div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
                        <Link href="/studio/modules">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{moduleData.name}</h1>
                            <Badge variant={moduleData.isActive ? "default" : "secondary"} className={moduleData.isActive ? "bg-emerald-100 text-emerald-800" : ""}>
                                {moduleData.isActive ? 'Active' : 'Draft'}
                            </Badge>
                        </div>
                        {moduleData.description && (
                            <p className="text-sm text-slate-500">
                                {moduleData.description}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setActiveTab('settings')}>
                        <Settings className="mr-2 h-4 w-4" /> Config
                    </Button>
                    <Button asChild>
                        <Link href={`/studio/modules/${moduleId}/records/new`}>
                            <Plus className="mr-2 h-4 w-4" /> Add Record
                        </Link>
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="records">Data Records</TabsTrigger>
                    <TabsTrigger value="schema">Schema details</TabsTrigger>
                    <TabsTrigger value="import_export">Import/Export</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Data Records Tab */}
                <TabsContent value="records" className="flex-1 flex flex-col mt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search records..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border bg-white flex-1 relative flex flex-col overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 border-b">
                                    <TableRow>
                                        {/* Render dynamic columns based on schema */}
                                        {fieldsData?.slice(0, 5).map(f => (
                                            <TableHead key={f.id} className="whitespace-nowrap">{f.label}</TableHead>
                                        ))}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingRecords || loadingFields ? (
                                        <TableRow>
                                            <TableCell colSpan={(fieldsData?.slice(0, 5).length ?? 5) + 1} className="h-48 text-center text-slate-500">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading records...
                                            </TableCell>
                                        </TableRow>
                                    ) : !recordsData?.length ? (
                                        <TableRow>
                                            <TableCell colSpan={(fieldsData?.slice(0, 5).length ?? 5) + 1} className="h-48 text-center text-slate-500">
                                                No records found. <Link href={`/studio/modules/${moduleId}/records/new`} className="text-primary hover:underline">Create one</Link>.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recordsData.map((record: any) => (
                                            <TableRow key={record.id} className="hover:bg-slate-50">
                                                {fieldsData?.slice(0, 5).map(f => (
                                                    <TableCell key={f.id} className="max-w-[200px] truncate">
                                                        {f.type === 'boolean'
                                                            ? (record.data[f.name] ? 'Yes' : 'No')
                                                            : f.type === 'date'
                                                                ? (() => { try { return record.data[f.name] ? format(new Date(record.data[f.name]), 'PPp') : '-'; } catch { return String(record.data[f.name] || '-'); } })()
                                                                : (f.type === 'file' || f.type === 'image') && record.data[f.name]
                                                                    ? (f.type === 'image'
                                                                        ? <img src={record.data[f.name]} alt={f.label} className="h-8 w-8 rounded object-cover inline-block" />
                                                                        : <a href={record.data[f.name]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View file</a>)
                                                                    : typeof record.data[f.name] === 'object'
                                                                        ? JSON.stringify(record.data[f.name])
                                                                        : String(record.data[f.name] ?? '-')}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4 text-slate-600" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/studio/modules/${moduleId}/records/${record.id}/edit`}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Record
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeleteRecord(record.id)} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                {/* Schema Tab */}
                <TabsContent value="schema" className="mt-6 flex flex-col gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Data Structure</CardTitle>
                                <CardDescription>Fields assigned to this custom module.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('records')}>
                                <Code className="mr-2 h-4 w-4" /> View Records
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {fieldsData?.map((f: any) => (
                                    <div key={f.id} className="flex flex-col p-4 rounded-lg bg-slate-50 border border-slate-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-slate-900 text-sm">{f.label}</span>
                                            <Badge variant="secondary" className="font-mono text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700">
                                                {f.type}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 pt-2 mt-2">
                                            <span className="font-mono">key: {f.name}</span>
                                            {f.required ? <span className="text-red-500 font-medium">Required</span> : <span>Optional</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Import / Export Tab */}
                <TabsContent value="import_export" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Import Data (CSV)</CardTitle>
                                <CardDescription>Bulk upload records into this module.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div
                                    className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-6 w-6 mb-2 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">
                                        {importFile ? importFile.name : 'Click to upload CSV'}
                                    </span>
                                    <span className="text-xs">Comma separated values only</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={handleImportCSV} disabled={!importFile || isImporting}>
                                    {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : 'Upload & Import'}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Export Data</CardTitle>
                                <CardDescription>Download all records as a CSV file.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-6">
                                    Exporting will generate a background job if you have more than 5,000 records. For smaller datasets, it downloads immediately.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full" asChild>
                                    <a href={`/api/studio/modules/${moduleId}/records/export`} download>
                                        <Download className="mr-2 h-4 w-4" /> Download CSV
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-6">
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                            <CardDescription>Irreversible and destructive actions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between border border-red-100 p-4 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-slate-900">Delete Module</h4>
                                    <p className="text-sm text-slate-500">Permanently remove this module and all its data records.</p>
                                </div>
                                <Button variant="destructive" onClick={handleDeleteModule} disabled={isDeletingModule}>
                                    {isDeletingModule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete Module'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
