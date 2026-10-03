'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

const MODULE_GL_EVENTS: Record<string, string[]> = {
    'vehicle-export': ['VEHICLE_PURCHASE', 'AUCTION_FEE', 'CUSTOMER_DEPOSIT', 'EXPORT_SALE'],
    'spareparts': ['PURCHASE_PARTS', 'SALE_INVOICE', 'PAYMENT_RECEIVED', 'REFUND_ISSUED', 'PURCHASE_RETURN'],
    'hotel': ['ROOM_REVENUE', 'F_AND_B', 'SPA', 'LAUNDRY', 'EVENT', 'OTHER', 'PAYMENT_RECEIVED', 'REFUND_ISSUED', 'GUEST_DEPOSIT'],
    'pos': ['SALE_CASH', 'SALE_CARD'],
    'restaurant': ['SALE_CASH', 'SALE_CARD'],
    'sales': ['SALE_INVOICED', 'PAYMENT_RECEIVED', 'CREDIT_MEMO', 'SALE_TAX'],
    'hr': ['EXPENSE_PAYMENT', 'PAYROLL_EXPENSE'],
    'properties': ['RENT_INCOME', 'SECURITY_DEPOSIT', 'MAINTENANCE_EXP']
};

export default function AccountMappingsPage() {
        const [accounts, setAccounts] = useState<any[]>([]);
    const [mappings, setMappings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeModule, setActiveModule] = useState('vehicle-export');

    const [localState, setLocalState] = useState<Record<string, { debitAccountId: string, creditAccountId: string }>>({});

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [accountsRes, mappingsRes] = await Promise.all([
                    fetch('/api/accounting/accounts'),
                    fetch('/api/accounting/module-mappings')
                ]);
                if (accountsRes.ok) {
                    const accData = await accountsRes.json();
                    setAccounts(accData);
                } else {
                    toast.error('Error', { description: `Failed to load accounts: ${accountsRes.statusText}` });
                }

                if (mappingsRes.ok) {
                    const mapData = await mappingsRes.json();
                    setMappings(mapData);

                    // Initialize local state
                    const initial: Record<string, { debitAccountId: string, creditAccountId: string }> = {};
                    mapData.forEach((m: any) => {
                        initial[`${m.moduleSlug}-${m.eventType}`] = {
                            debitAccountId: m.debitAccountId || '',
                            creditAccountId: m.creditAccountId || ''
                        };
                    });
                    setLocalState(initial);
                } else {
                    toast.error('Error', { description: `Failed to load mappings: ${mappingsRes.statusText}` });
                }
            } catch (error) {
                console.error('Failed to load mapping data', error);
                toast.error('Error', { description: 'Failed to load account mappings' });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [toast]);

    const handleSelectChange = (moduleSlug: string, eventType: string, type: 'debitAccountId' | 'creditAccountId', value: string) => {
        setLocalState(prev => ({
            ...prev,
            [`${moduleSlug}-${eventType}`]: {
                ...(prev[`${moduleSlug}-${eventType}`] || { debitAccountId: '', creditAccountId: '' }),
                [type]: value === 'unmapped' ? '' : value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const allItems = Object.keys(localState).filter(key => key.startsWith(`${activeModule}-`)).map(key => {
                const eventType = key.replace(`${activeModule}-`, '');
                return {
                    moduleSlug: activeModule,
                    eventType,
                    ...localState[key]
                };
            });

            const incompleteUpdates = allItems.filter(item => (item.debitAccountId && !item.creditAccountId) || (!item.debitAccountId && item.creditAccountId));
            if (incompleteUpdates.length > 0) {
                toast.error('Incomplete Mappings', { description: `The following event types have only one account mapped: ${incompleteUpdates.map(u => u.eventType).join(', ')}. Both debit and credit accounts are required.` });
                setSaving(false);
                return;
            }

            const updates = allItems.filter(item => item.debitAccountId && item.creditAccountId);

            const promises = updates.map(u => fetch('/api/accounting/module-mappings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(u)
            }));

            const results = await Promise.all(promises);
            const failed = results.filter(r => !r.ok);
            if (failed.length > 0) {
                throw new Error(`${failed.length} updates failed to save`);
            }

            toast.success('Mappings saved', { description: `Successfully updated mapping configuration for ${activeModule}` });
        } catch (error: any) {
            toast.error('Save Failed', { description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const modules = Object.keys(MODULE_GL_EVENTS);

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">GL Account Mappings</h1>
                <p className="text-slate-500 mt-2 font-medium">Configure debit and credit endpoints for automated cross-module journal entries.</p>
            </motion.div>

            <Alert className="bg-blue-50/50 border-blue-100 text-blue-800">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertTitle>Dynamic Event Processing</AlertTitle>
                <AlertDescription>
                    Transactions generated by external modules will use these default accounts unless overridden dynamically by the transaction.
                </AlertDescription>
            </Alert>

            {loading ? (
                <div className="flex items-center justify-center p-12 text-slate-400">
                    <RefreshCw className="animate-spin w-6 h-6 mr-3" /> Loading configuration...
                </div>
            ) : (
                <Tabs value={activeModule} onValueChange={setActiveModule} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-slate-200/50 flex flex-wrap gap-2 h-auto p-1">
                            {modules.map(mod => (
                                <TabsTrigger
                                    key={mod}
                                    value={mod}
                                    className="capitalize data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                                >
                                    {mod.replace('-', ' ')}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Commit Mappings
                        </Button>
                    </div>

                    {modules.map(mod => (
                        <TabsContent key={mod} value={mod}>
                            <Card className="border-slate-100 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="capitalize text-slate-800">{mod.replace('-', ' ')} Integration</CardTitle>
                                    <CardDescription>Map financial lifecycle events triggered by the {mod} module to your Chart of Accounts.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {MODULE_GL_EVENTS[mod].map(evt => {
                                            const key = `${mod}-${evt}`;
                                            const currentState = localState[key] || { debitAccountId: '', creditAccountId: '' };
                                            return (
                                                <div key={evt} className="grid grid-cols-[1fr_2fr_2fr] items-center gap-6 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-100 transition-colors">
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 tracking-tight text-sm uppercase">{evt.replace(/_/g, ' ')}</h4>
                                                        <p className="text-xs text-slate-500 mt-1">Automatic clearing code mapping</p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase">Debit (Dr)</label>
                                                        <Select value={currentState.debitAccountId || 'unmapped'} onValueChange={(v) => handleSelectChange(mod, evt, 'debitAccountId', v)}>
                                                            <SelectTrigger className="bg-white">
                                                                <SelectValue placeholder="Select Account" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="unmapped">Use System Default fallback</SelectItem>
                                                                {accounts.map(acc => (
                                                                    <SelectItem key={acc.id} value={acc.id}>
                                                                        {acc.code} - {acc.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase">Credit (Cr)</label>
                                                        <Select value={currentState.creditAccountId || 'unmapped'} onValueChange={(v) => handleSelectChange(mod, evt, 'creditAccountId', v)}>
                                                            <SelectTrigger className="bg-white">
                                                                <SelectValue placeholder="Select Account" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="unmapped">Use System Default fallback</SelectItem>
                                                                {accounts.map(acc => (
                                                                    <SelectItem key={acc.id} value={acc.id}>
                                                                        {acc.code} - {acc.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}
