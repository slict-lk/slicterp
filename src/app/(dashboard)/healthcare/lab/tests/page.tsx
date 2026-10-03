"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FlaskConical, Edit, Trash2, RefreshCw, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';

interface LabTest {
    id: string;
    name: string;
    code: string;
    category: string | null;
    price: number;
    description: string | null;
    resultTemplate: string | null;
    isActive: boolean;
}

export default function LabTestsManagementPage() {
    const router = useRouter();
    const [tests, setTests] = useState<LabTest[]>([]);
    const [filteredTests, setFilteredTests] = useState<LabTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<LabTest | null>(null);
    const [form, setForm] = useState({
        name: '',
        code: '',
        category: '',
        price: 0,
        description: '',
        resultTemplate: '',
    });

    const fetchTests = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/healthcare/lab-tests');
            if (res.ok) {
                const data = await res.json();
                setTests(data.labTests || (Array.isArray(data) ? data : []));
            }
        } catch (error) {
            console.error('Error fetching tests:', error);
            toast.error('Failed to load lab tests');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    useEffect(() => {
        if (searchQuery) {
            setFilteredTests(tests.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
            ));
        } else {
            setFilteredTests(tests);
        }
    }, [tests, searchQuery]);

    const resetForm = () => {
        setForm({ name: '', code: '', category: '', price: 0, description: '', resultTemplate: '' });
        setEditingTest(null);
    };

    const handleSave = async () => {
        if (!form.name || !form.code) {
            toast.error('Name and code are required');
            return;
        }

        try {
            const url = editingTest
                ? `/api/healthcare/lab-tests/${editingTest.id}`
                : '/api/healthcare/lab-tests';

            const res = await fetch(url, {
                method: editingTest ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!res.ok) throw new Error('Failed to save');

            toast.success(editingTest ? 'Test updated' : 'Test created');
            setIsAddOpen(false);
            resetForm();
            fetchTests();
        } catch (error) {
            toast.error('Failed to save test');
        }
    };

    const handleEdit = (test: LabTest) => {
        setEditingTest(test);
        setForm({
            name: test.name,
            code: test.code,
            category: test.category || '',
            price: test.price,
            description: test.description || '',
            resultTemplate: test.resultTemplate || '',
        });
        setIsAddOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this lab test?')) return;

        try {
            const res = await fetch(`/api/healthcare/lab-tests/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete');

            toast.success('Test deleted');
            fetchTests();
        } catch (error) {
            toast.error('Failed to delete test');
        }
    };

    const categories = [...new Set(tests.map(t => t.category).filter(Boolean))];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 p-6 text-white shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0tNCAwSDMwVjBoMnYzNHptLTQgMEgyOFYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDIwVjBoMnYzNHptLTQgMEgxNlYwaDJ2MzR6bS00IDBoLTJWMGgydjM0em0tNCAwSDhWMGgydjM0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
                <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/healthcare/lab')} className="text-white hover:bg-white/20">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Lab Test Catalog</h1>
                            <p className="mt-1 text-teal-100">Manage available laboratory tests and pricing</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchTests} className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                        </Button>
                        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
                            <DialogTrigger asChild>
                                <Button className="bg-white text-teal-700 hover:bg-white/90">
                                    <Plus className="mr-2 h-4 w-4" /> Add Test
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>{editingTest ? 'Edit Lab Test' : 'Add New Lab Test'}</DialogTitle>
                                    <DialogDescription>Configure test details and result template</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Test Name *</Label>
                                            <Input
                                                placeholder="e.g., Complete Blood Count"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Test Code *</Label>
                                            <Input
                                                placeholder="e.g., CBC"
                                                value={form.code}
                                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Category</Label>
                                            <Input
                                                placeholder="e.g., Hematology"
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                                list="categories"
                                            />
                                            <datalist id="categories">
                                                {categories.map(c => <option key={c} value={c!} />)}
                                            </datalist>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Price (Rs.)</Label>
                                            <Input
                                                type="number"
                                                placeholder="500"
                                                value={form.price}
                                                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            placeholder="Optional description of the test..."
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Result Template</Label>
                                        <Textarea
                                            placeholder="Template for entering results, e.g.:&#10;Hemoglobin: ___ g/dL (Ref: 12-16)&#10;WBC: ___ /μL (Ref: 4000-11000)"
                                            value={form.resultTemplate}
                                            onChange={(e) => setForm({ ...form, resultTemplate: e.target.value })}
                                            rows={5}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleSave}>{editingTest ? 'Update' : 'Create'} Test</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50 to-teal-100 shadow-lg">
                    <CardContent className="relative flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-cyan-600">Total Tests</p>
                            <p className="mt-1 text-4xl font-bold text-cyan-700">{tests.length}</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 p-4 text-white shadow-lg">
                            <FlaskConical className="h-7 w-7" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-green-100 shadow-lg">
                    <CardContent className="relative flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-emerald-600">Categories</p>
                            <p className="mt-1 text-4xl font-bold text-emerald-700">{categories.length}</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-lg">
                            <FlaskConical className="h-7 w-7" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg">
                    <CardContent className="relative flex items-center justify-between p-6">
                        <div>
                            <p className="text-sm font-medium text-blue-600">Active</p>
                            <p className="mt-1 text-4xl font-bold text-blue-700">{tests.filter(t => t.isActive !== false).length}</p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-lg">
                            <FlaskConical className="h-7 w-7" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Table */}
            <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FlaskConical className="h-5 w-5 text-teal-500" />
                                Lab Tests
                            </CardTitle>
                            <CardDescription>All available laboratory tests</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search tests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
                            <p className="mt-4 text-gray-500">Loading tests...</p>
                        </div>
                    ) : filteredTests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <FlaskConical className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="font-medium">No lab tests found</p>
                            <p className="text-sm text-gray-400 mt-1">Add your first test to get started</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTests.map((test) => (
                                    <TableRow key={test.id}>
                                        <TableCell className="font-mono font-medium">{test.code}</TableCell>
                                        <TableCell>{test.name}</TableCell>
                                        <TableCell>
                                            {test.category && <Badge variant="outline">{test.category}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">Rs.{test.price.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge className={test.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                                {test.isActive !== false ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(test)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDelete(test.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
