"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useModules, useDashboards, useWorkflows, useAutomations } from '@/hooks/use-studio';
import { Database, Layout, Workflow, Zap, Plus, ArrowRight, Activity, CalendarClock, Loader2 } from 'lucide-react';

function StatSkeleton() {
  return (
    <Card className="border-border/50 animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-slate-200 rounded"></div>
        <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 w-12 bg-slate-200 rounded mb-2"></div>
        <div className="h-3 w-32 bg-slate-100 rounded"></div>
      </CardContent>
    </Card>
  );
}

export default function StudioHubPage() {
  const { data: modules, isLoading: loadingModules } = useModules();
  const { data: dashboards, isLoading: loadingDashboards } = useDashboards();
  const { data: workflows, isLoading: loadingWorkflows } = useWorkflows();
  const { data: rules, isLoading: loadingRules } = useAutomations();

  const totalFields = modules?.reduce((acc, mod) => acc + (mod.schema?.fields?.length || 0), 0) || 0;
  const activeRules = rules?.filter((r: any) => r.isActive).length || 0;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Studio Hub</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20">
              <Activity className="h-3.5 w-3.5" />
              Live Environment
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Orchestrate your custom data models, dashboards, and automated workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/studio/modules/new">
              <Plus className="mr-2 h-4 w-4" />
              New Module
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingModules ? <StatSkeleton /> : (
          <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Custom Modules</CardTitle>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Database className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{modules?.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                Comprising {totalFields} custom fields
              </p>
            </CardContent>
          </Card>
        )}

        {loadingDashboards ? <StatSkeleton /> : (
          <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Dashboards</CardTitle>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Layout className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{dashboards?.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                Visualizing operational data
              </p>
            </CardContent>
          </Card>
        )}

        {loadingWorkflows ? <StatSkeleton /> : (
          <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Workflows</CardTitle>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Workflow className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{workflows?.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                Automated business processes
              </p>
            </CardContent>
          </Card>
        )}

        {loadingRules ? <StatSkeleton /> : (
          <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Rules</CardTitle>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Zap className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{activeRules}</div>
              <p className="text-xs text-slate-500 mt-1">
                Of {rules?.length || 0} total automation rules
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Modules */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Modules</CardTitle>
              <CardDescription>Your recently created data structures</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-slate-500 hover:text-slate-900">
              <Link href="/studio/modules">
                View all <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingModules ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
            ) : !modules?.length ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 m-4 rounded-lg border border-dashed border-slate-200">
                <Database className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-900">No modules yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Create your first custom data module to get started.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/studio/modules/new">Create Module</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {modules.slice(0, 4).map((mod) => (
                  <div key={mod.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{mod.name}</p>
                        <p className="text-xs text-slate-500">{mod.schema?.fields?.length || 0} fields</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/studio/modules/${mod.id}`}>Manage</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Workflows */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Process Workflows</CardTitle>
              <CardDescription>Recently designed automation flows</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-slate-500 hover:text-slate-900">
              <Link href="/studio/workflows">
                View all <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loadingWorkflows ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
            ) : !workflows?.length ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 m-4 rounded-lg border border-dashed border-slate-200">
                <Workflow className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-900">No workflows yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Design visual workflows to automate your operations.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/studio/workflows/new">Create Workflow</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {workflows.slice(0, 4).map((wf) => (
                  <div key={wf.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                        <Workflow className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{wf.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className={wf.isActive ? "text-emerald-600 font-medium" : "text-slate-500 font-medium"}>
                            {wf.isActive ? "Active" : "Draft"}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{wf.triggerType.replace(/_/g, ' ')} trigger</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/studio/workflows/${wf.id}`}>Edit</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
