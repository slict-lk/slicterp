"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, UserCircle2, Mail, Phone, ExternalLink, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface CrmAccount {
    id: string;
    party?: { name: string; email?: string; phone?: string; };
    industry?: string;
    accountType?: string;
    website?: string;
    annualRevenue?: number;
    contacts?: any[];
}

const EMPTY_FORM = { name: "", email: "", phone: "", industry: "", accountType: "CORPORATE", website: "", annualRevenue: "" };

export default function CRMAccountsPage() {
    const [accounts, setAccounts] = useState<CrmAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [selected, setSelected] = useState<CrmAccount | null>(null);

    useEffect(() => { fetchAccounts(); }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/crm/accounts");
            if (!res.ok) throw new Error("Failed to load accounts");
            const payload = await res.json();
            setAccounts(payload.items || payload.data || (Array.isArray(payload) ? payload : []));
        } catch { setError("Could not load account directory."); }
        finally { setLoading(false); }
    };

    const handleAddAccount = async () => {
        if (!form.name.trim()) { setFormError("Company name is required."); return; }
        try {
            setSubmitting(true); setFormError(null);
            const res = await fetch("/api/crm/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim() || undefined,
                    phone: form.phone.trim() || undefined,
                    industry: form.industry.trim() || undefined,
                    accountType: form.accountType || undefined,
                    website: form.website.trim() || undefined,
                    annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
                }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || "Failed to create account"); }
            setShowAdd(false); setForm({ ...EMPTY_FORM }); fetchAccounts();
        } catch (err: any) { setFormError(err?.message || "Failed to add account."); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Account Directory
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Navigate your global network of corporate partners and parties.
                    </p>
                </div>
                <Button className="flex-1 sm:flex-none shadow-glow-sm hover:shadow-glow transition-shadow h-10 px-6"
                    onClick={() => { setShowAdd(true); setFormError(null); }}>
                    <Plus className="mr-2 h-4 w-4" /> New Account
                </Button>
            </div>

            {error && <Alert variant="destructive"><AlertTitle>Directory Access Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="grid gap-6 xl:grid-cols-4">
                {/* Intelligence Panel */}
                <div className="hidden xl:block xl:col-span-1 space-y-6">
                    <Card className="glass border-primary/10 shadow-sm overflow-hidden sticky top-6">
                        <CardHeader className="bg-primary/5 pb-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-tighter">
                                <Building2 className="h-4 w-4" /> 360° Intelligence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {selected ? (
                                <div className="space-y-3">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mx-auto">
                                        {selected.party?.name?.[0] || "?"}
                                    </div>
                                    <p className="font-bold text-center text-sm">{selected.party?.name}</p>
                                    {selected.party?.email && (
                                        <a href={`mailto:${selected.party.email}`} className="text-xs text-primary flex items-center justify-center gap-1 hover:underline">
                                            <Mail className="h-3 w-3" />{selected.party.email}
                                        </a>
                                    )}
                                    {selected.party?.phone && (
                                        <a href={`tel:${selected.party.phone}`} className="text-xs text-muted-foreground flex items-center justify-center gap-1 hover:text-primary">
                                            <Phone className="h-3 w-3" />{selected.party.phone}
                                        </a>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-primary/5">
                                        <div className="text-center">
                                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Industry</p>
                                            <p className="text-xs font-bold mt-0.5">{selected.industry || "—"}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Type</p>
                                            <p className="text-xs font-bold mt-0.5">{selected.accountType || "—"}</p>
                                        </div>
                                    </div>
                                    {selected.annualRevenue && (
                                        <div className="text-center pt-2 border-t border-primary/5">
                                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Annual Capital</p>
                                            <p className="text-sm font-black text-primary mt-0.5">{formatCurrency(selected.annualRevenue)}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center p-8 border-dashed border-2 border-primary/10 rounded-2xl bg-muted/5">
                                    <UserCircle2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground text-sm font-medium">Select an entity to view its 360° profile.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="glass border-primary/10 shadow-sm p-5 space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Portfolio Summary</h4>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{accounts.length}</span>
                                <span className="text-xs text-success font-bold">Total accounts</span>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full shadow-glow-sm" style={{ width: accounts.length > 0 ? "100%" : "0%" }} />
                        </div>
                    </Card>
                </div>

                {/* Main Directory */}
                <div className="xl:col-span-3">
                    {loading ? (
                        <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
                    ) : accounts.length === 0 ? (
                        <div className="p-20 text-center glass rounded-3xl border-dashed border-2 flex flex-col items-center">
                            <Building2 className="h-20 w-20 text-muted-foreground opacity-5 mb-6" />
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Entities Found</h3>
                            <p className="text-muted-foreground mt-2 max-w-sm">Capture new commercial accounts or sync your database to see integrated parties here.</p>
                            <Button className="mt-8 rounded-xl h-11 px-8 shadow-glow-sm" onClick={() => setShowAdd(true)}>Initialize First Account</Button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block glass rounded-2xl border-primary/5 shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50 dark:bg-muted/20 backdrop-blur-md">
                                        <TableRow className="border-b-primary/5 hover:bg-transparent">
                                            <TableHead className="pl-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Entity Name & Presence</TableHead>
                                            <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Contact Architecture</TableHead>
                                            <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Classification</TableHead>
                                            <TableHead className="text-right py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Annual Capital</TableHead>
                                            <TableHead className="text-center pr-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Contacts</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {accounts.map((account, idx) => (
                                            <TableRow key={account.id}
                                                className="group cursor-pointer hover:bg-primary/5 transition-colors border-b-primary/5 animate-fade-in-up"
                                                style={{ animationDelay: `${idx * 40}ms` }}
                                                onClick={() => setSelected(selected?.id === account.id ? null : account)}>
                                                <TableCell className="font-medium px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform ring-1 ring-primary/5 ${selected?.id === account.id ? 'bg-primary text-white' : 'bg-primary/10'}`}>
                                                            {(account.party?.name || "U")[0]}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                                                                {account.party?.name || "Unknown Party"}
                                                            </span>
                                                            {account.website && (
                                                                <a href={account.website} target="_blank" rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 hover:text-primary transition-colors"
                                                                    onClick={e => e.stopPropagation()}>
                                                                    <ExternalLink className="h-3 w-3" /> {account.website}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                                        {account.party?.email && (
                                                            <a href={`mailto:${account.party.email}`} onClick={e => e.stopPropagation()}
                                                                className="flex items-center gap-2 hover:text-primary transition-colors">
                                                                <Mail className="h-3 w-3 text-muted-foreground" /> {account.party.email}
                                                            </a>
                                                        )}
                                                        {account.party?.phone && (
                                                            <a href={`tel:${account.party.phone}`} onClick={e => e.stopPropagation()}
                                                                className="flex items-center gap-2 hover:text-primary transition-colors">
                                                                <Phone className="h-3 w-3 text-muted-foreground" /> {account.party.phone}
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        <Badge variant="outline" className="font-black text-[9px] uppercase tracking-tighter bg-slate-50 dark:bg-white/5 border-primary/10 text-slate-600 dark:text-slate-400">
                                                            {account.industry || "General"}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{account.accountType || "Standard"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-black text-slate-700 dark:text-slate-200">
                                                    {account.annualRevenue ? formatCurrency(account.annualRevenue) : "—"}
                                                </TableCell>
                                                <TableCell className="text-center pr-6">
                                                    <Badge variant="secondary" className="font-mono text-[10px] h-6 px-2 bg-primary/10 text-primary border-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        {account.contacts?.length || 0}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="lg:hidden space-y-4">
                                {accounts.map((account, idx) => (
                                    <Card key={account.id} className="glass hover-lift border-primary/5 overflow-hidden group animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                                        <CardContent className="p-5 flex flex-col gap-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                                                        {(account.party?.name || "U")[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-lg">{account.party?.name || "Unknown"}</div>
                                                        <div className="text-sm text-muted-foreground">{account.industry || "General"}</div>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary">
                                                    {account.contacts?.length || 0} contacts
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-2">
                                                    {account.party?.email && (
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all" asChild>
                                                            <a href={`mailto:${account.party.email}`}><Mail className="h-4 w-4" /></a>
                                                        </Button>
                                                    )}
                                                    {account.party?.phone && (
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all" asChild>
                                                            <a href={`tel:${account.party.phone}`}><Phone className="h-4 w-4" /></a>
                                                        </Button>
                                                    )}
                                                </div>
                                                <Button variant="outline" size="sm" className="rounded-xl h-9 px-4" onClick={() => setSelected(account)}>
                                                    Full 360° View
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile 360° Panel */}
            {selected && (
                <Card className="xl:hidden glass border-primary/10 shadow-sm">
                    <CardHeader className="bg-primary/5 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-tighter">
                            <Building2 className="h-4 w-4" /> 360° Profile — {selected.party?.name}
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelected(null)}>✕ Close</Button>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 gap-4">
                        <div><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Industry</p><p className="text-sm font-bold mt-0.5">{selected.industry || "—"}</p></div>
                        <div><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Type</p><p className="text-sm font-bold mt-0.5">{selected.accountType || "—"}</p></div>
                        {selected.annualRevenue && (
                            <div className="col-span-2"><p className="text-[9px] uppercase tracking-widest text-muted-foreground">Annual Capital</p><p className="text-lg font-black text-primary mt-0.5">{formatCurrency(selected.annualRevenue)}</p></div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Add Account Dialog */}
            <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setFormError(null); setForm({ ...EMPTY_FORM }); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Account</DialogTitle>
                        <DialogDescription>Create a new corporate account in the CRM directory.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
                        <div className="space-y-1.5">
                            <Label htmlFor="acc-name">Company Name *</Label>
                            <Input id="acc-name" placeholder="ACME Corporation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="acc-email">Email</Label>
                                <Input id="acc-email" type="email" placeholder="info@acme.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="acc-phone">Phone</Label>
                                <Input id="acc-phone" placeholder="+1 555 0100" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="acc-industry">Industry</Label>
                                <Input id="acc-industry" placeholder="Technology" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Account Type</Label>
                                <Select value={form.accountType} onValueChange={v => setForm(f => ({ ...f, accountType: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CORPORATE">Corporate</SelectItem>
                                        <SelectItem value="SME">SME</SelectItem>
                                        <SelectItem value="STARTUP">Startup</SelectItem>
                                        <SelectItem value="GOVERNMENT">Government</SelectItem>
                                        <SelectItem value="NGO">NGO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="acc-website">Website</Label>
                                <Input id="acc-website" placeholder="https://acme.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="acc-revenue">Annual Revenue</Label>
                                <Input id="acc-revenue" type="number" min="0" placeholder="1000000" value={form.annualRevenue} onChange={e => setForm(f => ({ ...f, annualRevenue: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button onClick={handleAddAccount} disabled={submitting}>
                            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : "Create Account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
