"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Zap, AlertTriangle, Loader2 } from 'lucide-react';

export default function NewAutomationRulePage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [moduleName, setModuleName] = useState('');
    const [event, setEvent] = useState('');
    const [action, setAction] = useState('');

    // Basic payload configuration matching the existing primitive AutomationRule schema
    const [conditions, setConditions] = useState([{ field: '', operator: 'equals', value: '' }]);
    const [conditionsRaw, setConditionsRaw] = useState(() => JSON.stringify([{ field: '', operator: 'equals', value: '' }], null, 2));
    const [conditionsError, setConditionsError] = useState<string | null>(null);
    const [actionConfig, setActionConfig] = useState('{}');

    const handleSubmit = async () => {
        if (!name || !moduleName || !event || !action) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Validate conditions JSON
        try {
            const parsed = JSON.parse(conditionsRaw);
            setConditions(parsed);
        } catch {
            toast.error('Conditions must be valid JSON');
            return;
        }

        // Validate actionConfig is valid JSON
        try {
            JSON.parse(actionConfig);
        } catch {
            toast.error('Action Configuration must be valid JSON');
            return;
        }

        setIsSubmitting(true);
        try {
            // The API wraps the old AutomationRule model
            const payload = {
                name,
                description,
                module: moduleName,
                event,
                conditions: JSON.stringify(conditions), // Stores as JSON string per schema
                action,
                actionConfig,
                isActive
            };

            const res = await fetch('/api/studio/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create automation rule');
            }

            toast.success('Automation rule created successfully');
            router.push('/studio/automation');
        } catch (err: any) {
            toast.error(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full h-8 w-8">
                        <Link href="/studio/automation"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Automation Rule</h1>
                        <p className="text-sm text-slate-500">Design a simple if-then trigger for ERP events.</p>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-amber-800 text-sm">Legacy Feature</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Automation Rules are limited to single-action operations and are preserved for backwards compatibility.
                        For advanced logic, conditional routing, and multi-step processes, please use the new <Link href="/studio/workflows/new" className="font-bold underline cursor-pointer">Workflow Designer</Link>.
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
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Notify on High Value Invoice" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this rule do?" rows={2} />
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
                                value={conditionsRaw}
                                onChange={ev => setConditionsRaw(ev.target.value)}
                                onBlur={() => {
                                    try {
                                        setConditions(JSON.parse(conditionsRaw));
                                        setConditionsError(null);
                                    } catch {
                                        setConditionsError('Invalid JSON');
                                    }
                                }}
                                className={`font-mono text-xs ${conditionsError ? 'border-red-400' : ''}`}
                                rows={3}
                            />
                            {conditionsError && <p className="text-xs text-red-500">{conditionsError}</p>}
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
                                placeholder='{"to": "admin@erp.com", "template": "alert"}'
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" asChild><Link href="/studio/automation">Cancel</Link></Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Rule
                    </Button>
                </div>
            </div>
        </div>
    );
}
