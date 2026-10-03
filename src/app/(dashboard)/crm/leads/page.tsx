"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail, Phone, Building2, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";

interface CrmLead {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    status: string;
    priority: string;
    expectedRevenue?: number;
    createdAt: string;
}

const EMPTY_FORM = { name: "", company: "", email: "", phone: "", priority: "MEDIUM", expectedRevenue: "" };

export default function CRMLeadsPage() {
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [qualifyingId, setQualifyingId] = useState<string | null>(null);

    useEffect(() => { fetchLeads(); }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/crm/leads");
            if (!res.ok) throw new Error("Failed to load leads");
            const payload = await res.json();
            setLeads(payload.items || payload.data || (Array.isArray(payload) ? payload : []));
        } catch { setError("Could not load leads."); }
        finally { setLoading(false); }
    };

    const handleAddLead = async () => {
        if (!form.name.trim()) { setFormError("Name is required."); return; }
        try {
            setSubmitting(true); setFormError(null);
            const res = await fetch("/api/crm/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    company: form.company.trim() || undefined,
                    email: form.email.trim() || undefined,
                    phone: form.phone.trim() || undefined,
                    priority: form.priority,
                    expectedRevenue: form.expectedRevenue ? Number(form.expectedRevenue) : 0,
                }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || "Failed"); }
            setShowAdd(false); setForm({ ...EMPTY_FORM }); fetchLeads();
        } catch (err: any) { setFormError(err?.message || "Failed to add lead."); }
        finally { setSubmitting(false); }
    };

    const handleQualify = async (leadId: string) => {
        try {
            setQualifyingId(leadId);
            const res = await fetch(`/api/crm/leads/${leadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "QUALIFIED" }),
            });
            if (!res.ok) throw new Error("Failed to qualify");
            fetchLeads();
        } catch { alert("Failed to qualify lead."); }
        finally { setQualifyingId(null); }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "NEW": return <Badge className="bg-primary/10 text-primary border-primary/20">New</Badge>;
            case "CONTACTED": return <Badge className="bg-blue-100/50 text-blue-700 border-blue-200">Contacted</Badge>;
            case "QUALIFIED": return <Badge className="bg-emerald-100/50 text-emerald-700 border-emerald-200 font-bold">Qualified</Badge>;
            case "UNQUALIFIED": return <Badge variant="destructive">Unqualified</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "URGENT":
            case "HIGH": return <Badge variant="destructive">{priority}</Badge>;
            case "MEDIUM": return <Badge className="bg-amber-100 text-amber-700 font-bold border-amber-200">{priority}</Badge>;
            case "LOW": return <Badge variant="outline" className="bg-slate-100 text-slate-600">{priority}</Badge>;
            default: return <Badge variant="outline">{priority}</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Leads & Prospects
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Qualify incoming prospects before converting them to pipeline opportunities.
                    </p>
                </div>
                <Button className="flex-1 sm:flex-none shadow-glow-sm hover:shadow-glow transition-shadow h-10 px-6"
                    onClick={() => { setShowAdd(true); setFormError(null); }}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Lead
                </Button>
            </div>

            {error && (
                <Alert variant="destructive"><AlertTitle>Network Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            )}

            {loading ? (
                <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
            ) : leads.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center glass rounded-3xl border-dashed border-2">
                    <UserPlus className="h-16 w-16 text-muted-foreground opacity-10 mb-4" />
                    <p className="text-muted-foreground text-xl font-medium">No leads currently in your queue</p>
                    <Button variant="link" className="mt-4 text-primary" onClick={() => setShowAdd(true)}>Add your first lead</Button>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block glass rounded-2xl border-primary/5 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50 dark:bg-muted/20 backdrop-blur-md">
                                <TableRow className="border-b-primary/5 hover:bg-transparent">
                                    <TableHead className="pl-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Prospect Identity</TableHead>
                                    <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Contact</TableHead>
                                    <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Stage</TableHead>
                                    <TableHead className="py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Priority</TableHead>
                                    <TableHead className="text-right pr-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Value / Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead, idx) => (
                                    <TableRow key={lead.id} className="group cursor-pointer hover:bg-primary/5 transition-colors border-b-primary/5 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <TableCell className="font-medium px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                                                    {lead.company?.charAt(0) || lead.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{lead.name}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                        <Building2 className="h-3 w-3" /> {lead.company || "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {lead.email && (
                                                    <a href={`mailto:${lead.email}`} className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                                                        <Mail className="h-3 w-3 text-muted-foreground" /> {lead.email}
                                                    </a>
                                                )}
                                                {lead.phone && (
                                                    <a href={`tel:${lead.phone}`} className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                                                        <Phone className="h-3 w-3 text-muted-foreground" /> {lead.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{getStatusBadge(lead.status)}</TableCell>
                                        <TableCell className="text-center">{getPriorityBadge(lead.priority)}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="font-mono font-black text-slate-800 dark:text-slate-100">{formatCurrency(lead.expectedRevenue || 0)}</div>
                                                {lead.status !== "QUALIFIED" && (
                                                    <Button variant="ghost" size="sm" disabled={qualifyingId === lead.id} onClick={() => handleQualify(lead.id)}
                                                        className="h-8 text-[10px] opacity-0 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all px-2">
                                                        {qualifyingId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <>Qualify Deal <ChevronRight className="ml-1 h-3 w-3" /></>}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-4">
                        {leads.map((lead, idx) => (
                            <Card key={lead.id} className="glass hover-lift border-primary/5 overflow-hidden group animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                <CardContent className="p-5 flex flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                                                {lead.company?.charAt(0) || lead.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{lead.name}</div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Building2 className="h-3.5 w-3.5" /> {lead.company || "—"}
                                                </div>
                                            </div>
                                        </div>
                                        {getPriorityBadge(lead.priority)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-primary/5">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Lifecycle</p>
                                            {getStatusBadge(lead.status)}
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Value</p>
                                            <p className="font-mono font-black text-primary">{formatCurrency(lead.expectedRevenue || 0)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
                                                disabled={!lead.email} asChild>
                                                <a href={lead.email ? `mailto:${lead.email}` : "#"}><Mail className="h-4 w-4" /></a>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
                                                disabled={!lead.phone} asChild>
                                                <a href={lead.phone ? `tel:${lead.phone}` : "#"}><Phone className="h-4 w-4" /></a>
                                            </Button>
                                        </div>
                                        {lead.status !== "QUALIFIED" ? (
                                            <Button className="shadow-sm rounded-xl h-9 px-4" disabled={qualifyingId === lead.id} onClick={() => handleQualify(lead.id)}>
                                                {qualifyingId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Qualify Deal"}
                                            </Button>
                                        ) : (
                                            <Badge className="bg-emerald-100 text-emerald-700 font-bold border-emerald-200">Qualified ✓</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* Add Lead Dialog */}
            <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setFormError(null); setForm({ ...EMPTY_FORM }); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Lead</DialogTitle>
                        <DialogDescription>Capture a new prospect into the CRM pipeline.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
                        <div className="space-y-1.5">
                            <Label htmlFor="lead-name">Full Name *</Label>
                            <Input id="lead-name" placeholder="John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="lead-company">Company</Label>
                            <Input id="lead-company" placeholder="ACME Corp" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="lead-email">Email</Label>
                                <Input id="lead-email" type="email" placeholder="john@acme.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lead-phone">Phone</Label>
                                <Input id="lead-phone" placeholder="+1 555 0100" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lead-revenue">Est. Revenue</Label>
                                <Input id="lead-revenue" type="number" min="0" placeholder="10000" value={form.expectedRevenue} onChange={e => setForm(f => ({ ...f, expectedRevenue: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button onClick={handleAddLead} disabled={submitting}>
                            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</> : "Add Lead"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
