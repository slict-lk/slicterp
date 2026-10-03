"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Users, DollarSign, Target, CalendarClock, Phone, Mail, FileText, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ModuleCopilotPanel } from "@/components/ai/module-copilot-panel";

interface CrmMetrics {
    pipelineValue: number;
    activeOpportunities: number;
    leadCount: number;
}

interface CrmActivity {
    id: string;
    activityType: string;
    subject: string;
    description?: string;
    status: string;
    scheduledAt?: string;
    completedAt?: string;
    createdAt: string;
}

interface CrmOpportunity {
    id: string;
    name: string;
    stage: string;
    amount: number;
    probability: number;
    expectedCloseDate?: string;
}

interface CrmStage {
    id: string;
    name: string;
    sequence: number;
    probabilityPercent: number;
}

export default function CRMOverview() {
    const router = useRouter();
    const [metrics, setMetrics] = useState<CrmMetrics | null>(null);
    const [activities, setActivities] = useState<CrmActivity[]>([]);
    const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
    const [pipelineStages, setPipelineStages] = useState<CrmStage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [metricsRes, activitiesRes, oppsRes, pipeRes] = await Promise.all([
                fetch("/api/sales/metrics"),
                fetch("/api/crm/activities?limit=10"),
                fetch("/api/crm/opportunities?status=OPEN"),
                fetch("/api/crm/pipelines"),
            ]);

            if (metricsRes.ok) {
                const payload = await metricsRes.json();
                setMetrics(payload.data || payload);
            }
            if (activitiesRes.ok) {
                const payload = await activitiesRes.json();
                setActivities(payload.items || payload.data || (Array.isArray(payload) ? payload : []));
            }
            if (oppsRes.ok) {
                const payload = await oppsRes.json();
                setOpportunities(payload.items || payload.data || (Array.isArray(payload) ? payload : []));
            }
            if (pipeRes.ok) {
                const payload = await pipeRes.json();
                const pipes = payload.items || payload.data || (Array.isArray(payload) ? payload : []);
                const firstPipeline = pipes[0];
                setPipelineStages(firstPipeline?.stages || []);
            }
        } catch (error) {
            console.error("Failed to load CRM data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derived states
    const upcomingActivities = activities.filter(a => a.status === "PENDING" || a.status === "SCHEDULED" || a.status === "OPEN");
    const overdueActivities = upcomingActivities.filter(a => a.scheduledAt && new Date(a.scheduledAt).getTime() < Date.now());

    // Build pipeline chart from actual stages (UUID-keyed) or fall back to static names
    const staticStages = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
    const pipelineByStage = pipelineStages.length > 0
        ? pipelineStages
            .sort((a, b) => a.sequence - b.sequence)
            .map(s => {
                const stageOpps = opportunities.filter(o => (o.stage || "") === s.id);
                return { stage: s.name, count: stageOpps.length, value: stageOpps.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) };
            })
            .filter(s => s.count > 0 || ["Proposal", "Negotiation"].includes(s.stage))
        : staticStages.map(stage => {
            const stageOpps = opportunities.filter(o => (o.stage || "") === stage);
            return { stage, count: stageOpps.length, value: stageOpps.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) };
        }).filter(s => s.count > 0 || ["PROPOSAL", "NEGOTIATION"].includes(s.stage));

    const maxPipelineValue = Math.max(...pipelineByStage.map(s => s.value), 1);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'CALL': return <Phone className="h-4 w-4 text-primary" />;
            case 'EMAIL': return <Mail className="h-4 w-4 text-blue-500" />;
            case 'MEETING': return <Users className="h-4 w-4 text-purple-500" />;
            case 'TASK': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            default: return <FileText className="h-4 w-4 text-slate-500" />;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    CRM Overview
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Manage your sales pipeline, leads, and customer relationships in real-time with predictive intelligence.
                </p>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="glass hover-lift border-primary/10 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-mesh opacity-5 group-hover:opacity-10 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue Pipeline</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isLoading ? <div className="h-8 w-24 skeleton" /> : formatCurrency(metrics?.pipelineValue || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[10px] h-4">Active</Badge>
                            Open potential revenue
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass hover-lift border-primary/10 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-mesh opacity-5 group-hover:opacity-10 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Opportunities</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Target className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isLoading ? <div className="h-8 w-24 skeleton" /> : (metrics?.activeOpportunities || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Deals currently in progress</div>
                    </CardContent>
                </Card>

                <Card className="glass hover-lift border-primary/10 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-mesh opacity-5 group-hover:opacity-10 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Qualified Leads</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isLoading ? <div className="h-8 w-24 skeleton" /> : (metrics?.leadCount || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 text-success">Lead conversion ready</div>
                    </CardContent>
                </Card>

                <Card className="glass hover-lift border-primary/10 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-mesh opacity-5 group-hover:opacity-10 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Activities</CardTitle>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isLoading ? <div className="h-8 w-24 skeleton" /> : upcomingActivities.length}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {overdueActivities.length > 0 ? (
                                <Badge variant="destructive" className="animate-pulse text-[10px] h-4">
                                    {overdueActivities.length} overdue
                                </Badge>
                            ) : (
                                <p className="text-xs text-muted-foreground text-success">All on schedule</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ModuleCopilotPanel
                module="crm"
                title="CRM Copilot"
                description="Summarize pipeline risk, follow-up pressure, and account-level next actions."
                context={{
                    pipelineValue: metrics?.pipelineValue || 0,
                    activeOpportunities: metrics?.activeOpportunities || 0,
                    qualifiedLeads: metrics?.leadCount || 0,
                    upcomingActivities: upcomingActivities.length,
                    overdueActivities: overdueActivities.length,
                }}
                suggestions={[
                    'Summarize current pipeline risk and next best actions.',
                    'Which opportunities need immediate follow-up?',
                ]}
            />

            <div className="grid gap-6 grid-cols-1 xl:grid-cols-7 ">
                <Card className="xl:col-span-4 glass shadow-sm animate-scale-in">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Pipeline Dynamics</CardTitle>
                                <CardDescription>Distribution of active deal value by stage</CardDescription>
                            </div>
                            <Badge variant="outline" className="font-mono">Real-time Feed</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <div className="h-[350px] flex items-center justify-center flex-col gap-4">
                                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-muted-foreground">Loading pipeline data...</p>
                            </div>
                        ) : pipelineByStage.length === 0 ? (
                            <div className="h-[350px] flex flex-col items-center justify-center border-dashed border-2 rounded-2xl bg-muted/10">
                                <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground">No active opportunities found</p>
                                <Button variant="link" className="mt-2 text-primary" onClick={() => router.push('/crm/pipelines')}>Start new deal</Button>
                            </div>
                        ) : (
                            <div className="space-y-8 py-4">
                                {pipelineByStage.map((stage) => (
                                    <div key={stage.stage} className="space-y-3 group">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-slate-700 dark:text-slate-200">{stage.stage}</div>
                                                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px]">{stage.count}</Badge>
                                            </div>
                                            <div className="font-mono font-bold text-primary">{formatCurrency(stage.value)}</div>
                                        </div>
                                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 shadow-glow-sm"
                                                style={{ width: `${(stage.value / maxPipelineValue) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:col-span-3 glass shadow-sm animate-scale-in [animation-delay:200ms]">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Operational Queue</CardTitle>
                                <CardDescription>Next actions & recent touchpoints</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 w-full skeleton rounded-xl" />)}
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="h-[350px] flex flex-col items-center justify-center border-dashed border-2 rounded-2xl bg-muted/10">
                                <CalendarClock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground text-sm">No scheduled activities</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activities.slice(0, 6).map((activity, idx) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-start gap-4 p-4 rounded-xl border bg-card/50 hover-lift group cursor-pointer animate-fade-in-up"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="mt-0.5 p-2.5 bg-primary/5 group-hover:bg-primary/10 rounded-xl transition-colors ring-1 ring-primary/5">
                                            {getActivityIcon(activity.activityType)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold leading-none group-hover:text-primary transition-colors">{activity.subject}</p>
                                                <Badge
                                                    variant={activity.status === 'COMPLETED' ? 'secondary' : 'default'}
                                                    className={`text-[9px] uppercase tracking-tighter px-1.5 py-0 h-4 ${activity.status === 'COMPLETED' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-primary/20 text-primary border-primary/20'
                                                        }`}
                                                >
                                                    {activity.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {activity.description || "Establish commercial contact"}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-[10px] text-muted-foreground font-medium flex items-center">
                                                    <CalendarClock className="mr-1 h-3 w-3 text-slate-400" />
                                                    {new Date(activity.scheduledAt || activity.createdAt).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                <div className="flex -space-x-2">
                                                    <div className="h-5 w-5 rounded-full border-2 border-background bg-slate-200" />
                                                    <div className="h-5 w-5 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[8px] font-bold">+1</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-primary mt-2" onClick={() => router.push('/crm/activities')}>
                                    View full activity timeline →
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
