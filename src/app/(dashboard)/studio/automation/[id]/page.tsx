"use client";

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAutomation, useUpdateAutomationMutation } from '@/hooks/use-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Zap, AlertTriangle, Loader2 } from 'lucide-react';

export default function EditAutomationRulePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const ruleId = resolvedParams.id;
    const router = useRouter();

    const { data: rule, isLoading } = useAutomation(ruleId);
    const updateMutation = useUpdateAutomationMutation(ruleId);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [moduleName, setModuleName] = useState('');
    const [event, setEvent] = useState('');
    const [action, setAction] = useState('');

    const [conditions, setConditions] = useState<string>('[]');
    const [actionConfig, setActionConfig] = useState<string>('{}');

    useEffect(() => {
        if (rule) {
            setName(rule.name);
            setDescription(rule.description || '');
            setIsActive(rule.isActive);
            setModuleName(rule.module);
            setEvent(rule.event);
            setAction(rule.action);
            setConditions(rule.conditions);
            setActionConfig(rule.actionConfig);
        }
    }, [rule]);

    const handleSubmit = async () => {
        if (!name || !moduleName || !event || !action) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const payload = {
                name,
                description,
                module: moduleName,
                event,
                conditions,
                action,
                actionConfig,
                isActive
            };

            await updateMutation.mutateAsync(payload);
            toast.success('Automation rule updated successfully');
            router.push('/studio/automation');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update automation rule');
        }
    };

    if (isLoading) {
        return <div className="h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8">
                        <Link href="/studio/automation"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Automation Rule</h1>
                        <p className="text-sm text-slate-500">Update legacy ERP trigger configuration.</p>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-amber-800 text-sm">Legacy Feature</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Consider migrating this logic to the new <Link href="/studio/workflows/new" className="font-bold underline cursor-pointer">Workflow Designer</Link>.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <CardTitle className="text-base">Rule Metadata</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>Rule Name <span className="text-red-500">*</span></Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                            <Label>Active</Label>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <CardTitle className="text-base">Trigger Condition (IF)</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Module <span className="text-red-500">*</span></Label>
                            <Select value={moduleName} onValueChange={setModuleName}>
                                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="invoices">Invoices</SelectItem>
                                    <SelectItem value="sales_orders">Sales Orders</SelectItem>
                                    <SelectItem value="inventory">Inventory</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Event <span className="text-red-500">*</span></Label>
                            <Select value={event} onValueChange={setEvent}>
                                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="created">Created</SelectItem>
                                    <SelectItem value="updated">Updated</SelectItem>
                                    <SelectItem value="deleted">Deleted</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-2 space-y-2 border-t pt-4 mt-2">
                            <Label>Conditions (JSON)</Label>
                            <Textarea
                                value={conditions}
                                onChange={e => setConditions(e.target.value)}
                                className="font-mono text-xs"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <CardTitle className="text-base">Execution (THEN)</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>Action Required <span className="text-red-500">*</span></Label>
                            <Select value={action} onValueChange={setAction}>
                                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="send_email">Send Email</SelectItem>
                                    <SelectItem value="slack_notification">Slack Notification</SelectItem>
                                    <SelectItem value="webhook">Webhook Call</SelectItem>
                                    <SelectItem value="create_task">Create Internal Task</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Action Configuration (JSON String)</Label>
                            <Textarea
                                value={actionConfig}
                                onChange={e => setActionConfig(e.target.value)}
                                className="font-mono text-xs"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" asChild><Link href="/studio/automation">Cancel</Link></Button>
                    <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                        {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Update Rule
                    </Button>
                </div>
            </div>
        </div>
    );
}
