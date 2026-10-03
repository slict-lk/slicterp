"use client";

import { useState, useEffect, DragEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface CrmOpportunity {
    id: string;
    name: string;
    stage: string;
    stageId?: string;
    amount: number;
    probability: number;
    currency?: string;
    expectedCloseDate?: string;
}

interface KanbanStage {
    id: string;
    name: string;
    sequence: number;
    probabilityPercent: number;
    opportunities: CrmOpportunity[];
}

const DEFAULT_STAGES = [
    { id: "PROSPECTING", name: "Prospecting", sequence: 10, probabilityPercent: 10 },
    { id: "QUALIFICATION", name: "Qualification", sequence: 20, probabilityPercent: 30 },
    { id: "PROPOSAL", name: "Proposal", sequence: 30, probabilityPercent: 60 },
    { id: "NEGOTIATION", name: "Negotiation", sequence: 40, probabilityPercent: 80 },
    { id: "WON", name: "Closed Won", sequence: 50, probabilityPercent: 100 },
    { id: "LOST", name: "Closed Lost", sequence: 60, probabilityPercent: 0 },
];

const EMPTY_FORM = { name: "", amount: "", probability: "50", currency: "USD", expectedCloseDate: "", stageId: "" };

export default function CRMPipelinesPage() {
    const [stages, setStages] = useState<KanbanStage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [pipelineId, setPipelineId] = useState<string | null>(null);

    useEffect(() => { fetchPipeline(); }, []);

    const fetchPipeline = async () => {
        try {
            setLoading(true);
            const [oppRes, pipeRes] = await Promise.all([
                fetch("/api/crm/opportunities"),
                fetch("/api/crm/pipelines"),
            ]);

            if (!oppRes.ok) throw new Error("Failed to load opportunities");
            if (!pipeRes.ok) throw new Error("Failed to load pipeline configuration");

            const oppPayload = await oppRes.json();
            const data: CrmOpportunity[] = oppPayload.items || oppPayload.data || (Array.isArray(oppPayload) ? oppPayload : []);

            const pipePayload = await pipeRes.json();
            const pipelinesData = pipePayload.items || pipePayload.data || (Array.isArray(pipePayload) ? pipePayload : []);
            const activePipeline = pipelinesData[0];

            const apiStages: any[] = activePipeline?.stages || [];
            setPipelineId(activePipeline?.id ?? null);

            // Use API stages when available; fall back to static defaults
            const stageSource = apiStages.length > 0 ? apiStages : DEFAULT_STAGES;

            const constructed = stageSource.map((stage: any) => ({
                id: stage.id,
                name: stage.name,
                sequence: stage.sequence || 0,
                probabilityPercent: stage.probabilityPercent || 0,
                // Match by UUID stageId OR by string stage name
                opportunities: data.filter(opp => {
                    const oppStage = opp.stageId || opp.stage || "";
                    return oppStage === stage.id;
                }),
            }));

            // Unmatched opportunities go to first stage
            const knownIds = new Set(stageSource.map((s: any) => s.id));
            const unknown = data.filter(opp => {
                const oppStage = opp.stageId || opp.stage || "";
                return !knownIds.has(oppStage);
            });
            if (unknown.length > 0 && constructed.length > 0) {
                constructed[0].opportunities.push(...unknown);
            }

            setStages(constructed);
        } catch (err) {
            setError("Failed to load pipeline stages. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddOpportunity = async () => {
        if (!form.name.trim()) { setFormError("Opportunity name is required."); return; }
        try {
            setSubmitting(true); setFormError(null);
            const res = await fetch("/api/crm/opportunities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    amount: form.amount ? Number(form.amount) : 0,
                    probabilityPercent: Number(form.probability),
                    currency: form.currency,
                    expectedCloseDate: form.expectedCloseDate || undefined,
                    stageId: form.stageId || undefined,
                    pipelineId: pipelineId || undefined,
                }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || "Failed to create opportunity"); }
            setShowAdd(false); setForm({ ...EMPTY_FORM }); fetchPipeline();
        } catch (err: any) { setFormError(err?.message || "Failed to add opportunity."); }
        finally { setSubmitting(false); }
    };

    const handleDragStart = (e: DragEvent<HTMLDivElement>, oppId: string) => {
        setDraggingId(oppId);
        e.dataTransfer.setData("text/plain", oppId);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); };

    const handleDrop = async (e: DragEvent<HTMLDivElement>, targetStageId: string) => {
        e.preventDefault();
        const oppId = e.dataTransfer.getData("text/plain");
        if (!oppId || !targetStageId) return;

        let movedOpp: CrmOpportunity | undefined;
        setStages(prevStages => {
            const nextStages = prevStages.map(s => ({ ...s, opportunities: [...s.opportunities] }));
            for (const stage of nextStages) {
                const idx = stage.opportunities.findIndex(o => o.id === oppId);
                if (idx !== -1) {
                    movedOpp = { ...stage.opportunities[idx] };
                    stage.opportunities.splice(idx, 1);
                    break;
                }
            }
            if (movedOpp) {
                movedOpp.stage = targetStageId;
                movedOpp.stageId = targetStageId;
                const target = nextStages.find(s => s.id === targetStageId);
                if (target) target.opportunities.push(movedOpp);
            }
            return nextStages;
        });

        if (movedOpp) {
            try {
                const res = await fetch(`/api/crm/opportunities/${oppId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ stageId: targetStageId }),
                });
                if (!res.ok) throw new Error("Failed to update stage");
            } catch { fetchPipeline(); }
        }
        setDraggingId(null);
    };

    if (loading) {
        return (
            <div className="space-y-4 h-full">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-150px)]">
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-full w-[300px] flex-shrink-0 rounded-lg" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Pipelines
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Accelerate deals through your custom sales workflow via drag and drop.
                    </p>
                </div>
                <Button className="w-full sm:w-auto shadow-glow-sm hover:shadow-glow transition-shadow"
                    onClick={() => { setShowAdd(true); setFormError(null); }}>
                    <Plus className="mr-2 h-4 w-4" /> New Opportunity
                </Button>
            </div>

            <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-6 h-full min-h-[calc(100vh-250px)] w-max lg:w-full">
                    {stages.map(stage => (
                        <div key={stage.id}
                            className="flex-shrink-0 w-[85vw] sm:w-[320px] lg:w-full lg:max-w-[340px] flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-primary/5 shadow-sm group/column overflow-hidden"
                            onDragOver={handleDragOver}
                            onDrop={e => handleDrop(e, stage.id)}>
                            <div className="p-4 border-b bg-white/40 dark:bg-black/20 backdrop-blur-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    <div className="font-bold text-sm tracking-tight text-slate-700 dark:text-slate-200">{stage.name}</div>
                                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-mono opacity-70">
                                        {stage.opportunities.length}
                                    </Badge>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={() => { setForm(f => ({ ...f, stageId: stage.id })); setShowAdd(true); setFormError(null); }}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                {stage.opportunities.length === 0 ? (
                                    <div className="h-32 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-white/10 group-hover/column:border-primary/20 transition-colors cursor-pointer"
                                        onClick={() => { setForm(f => ({ ...f, stageId: stage.id })); setShowAdd(true); setFormError(null); }}>
                                        <Plus className="h-6 w-6 text-muted-foreground/20 mb-2" />
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Drop deal here</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {stage.opportunities.map((opp, idx) => (
                                            <div key={opp.id} draggable
                                                onDragStart={e => handleDragStart(e, opp.id)}
                                                className={`animate-fade-in-up ${draggingId === opp.id ? "opacity-30 scale-95" : "opacity-100"} transition-all`}
                                                style={{ animationDelay: `${idx * 40}ms` }}>
                                                <Card className="hover-lift cursor-grab active:cursor-grabbing border-primary/5 hover:border-primary/20 shadow-soft bg-white/80 dark:bg-slate-950/80 backdrop-blur-md overflow-hidden group/card relative">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate flex items-center justify-between gap-2" title={opp.name}>
                                                            {opp.name}
                                                        </div>
                                                        <div className="flex justify-between items-end">
                                                            <div className="space-y-1">
                                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
                                                                    <DollarSign className="h-3 w-3" /> Potential
                                                                </div>
                                                                <div className="text-sm font-black text-primary font-mono tabular-nums leading-none">
                                                                    {formatCurrency(opp.amount || 0, opp.currency || "USD")}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1.5">
                                                                <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${opp.probability > 70 ? "bg-green-100 text-green-700 border border-green-200" : opp.probability > 30 ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                                                                    {opp.probability}%
                                                                </div>
                                                                <div className="h-1 w-12 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div className={`h-full transition-all duration-500 ${opp.probability > 70 ? "bg-green-500" : opp.probability > 30 ? "bg-amber-500" : "bg-slate-400"}`}
                                                                        style={{ width: `${opp.probability}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* New Opportunity Dialog */}
            <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setFormError(null); setForm({ ...EMPTY_FORM }); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Opportunity</DialogTitle>
                        <DialogDescription>Add a new deal to the CRM pipeline.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
                        <div className="space-y-1.5">
                            <Label htmlFor="opp-name">Opportunity Name *</Label>
                            <Input id="opp-name" placeholder="Enterprise Deal — ACME Corp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Pipeline Stage</Label>
                            <Select value={form.stageId} onValueChange={v => setForm(f => ({ ...f, stageId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select stage…" /></SelectTrigger>
                                <SelectContent>
                                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="opp-amount">Deal Value</Label>
                                <Input id="opp-amount" type="number" min="0" placeholder="50000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="opp-prob">Probability %</Label>
                                <Input id="opp-prob" type="number" min="0" max="100" placeholder="50" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Currency</Label>
                                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="LKR">LKR</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="opp-close">Expected Close</Label>
                                <Input id="opp-close" type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button onClick={handleAddOpportunity} disabled={submitting}>
                            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : "Create Opportunity"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
