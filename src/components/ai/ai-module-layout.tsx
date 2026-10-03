"use client";

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, ChartColumn, Home, Settings2, ShieldCheck, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AIExperienceMode } from '@/lib/ai/control-plane-types';
import { AIExperienceProvider } from '@/components/ai/ai-experience-context';

type TopLevelSection = 'home' | 'tasks' | 'automations' | 'assistants' | 'insights' | 'admin';

type SectionConfig = {
  key: TopLevelSection;
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  matches: string[];
  children: Array<{ label: string; href: string }>;
};

const SECTIONS: SectionConfig[] = [
  {
    key: 'home',
    label: 'Home',
    description: 'Command center, onboarding, and quick actions.',
    href: '/ai',
    icon: Home,
    matches: ['/ai'],
    children: [{ label: 'Command Center', href: '/ai' }],
  },
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Approvals, issues, and operational follow-up.',
    href: '/ai/tasks',
    icon: ShieldCheck,
    matches: ['/ai/tasks', '/ai/inbox', '/ai/events'],
    children: [
      { label: 'Tasks Overview', href: '/ai/tasks' },
      { label: 'Approvals', href: '/ai/inbox' },
      { label: 'Event Activity', href: '/ai/events' },
    ],
  },
  {
    key: 'automations',
    label: 'Automations',
    description: 'Build and manage business automations.',
    href: '/ai/automations',
    icon: Wand2,
    matches: ['/ai/automations', '/ai/workflows', '/ai/templates'],
    children: [
      { label: 'Automation Home', href: '/ai/automations' },
      { label: 'Workflows', href: '/ai/workflows' },
      { label: 'Templates', href: '/ai/templates' },
    ],
  },
  {
    key: 'assistants',
    label: 'Assistants',
    description: 'Copilots and guided helpers for each module.',
    href: '/ai/assistants',
    icon: Bot,
    matches: ['/ai/assistants', '/ai/copilots', '/ai/agents'],
    children: [
      { label: 'Assistant Home', href: '/ai/assistants' },
      { label: 'Copilots', href: '/ai/copilots' },
      { label: 'Agents', href: '/ai/agents' },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    description: 'Analytics, predictions, and audit evidence.',
    href: '/ai/insights',
    icon: ChartColumn,
    matches: ['/ai/insights', '/ai/analytics', '/ai/audit'],
    children: [
      { label: 'Insights Home', href: '/ai/insights' },
      { label: 'Analytics', href: '/ai/analytics' },
      { label: 'Audit', href: '/ai/audit' },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Governance, provider setup, and defaults.',
    href: '/ai/admin',
    icon: Settings2,
    matches: ['/ai/admin', '/ai/models', '/ai/prompts', '/ai/policies', '/ai/integrations', '/ai/settings'],
    children: [
      { label: 'Admin Home', href: '/ai/admin' },
      { label: 'Models', href: '/ai/models' },
      { label: 'Prompts', href: '/ai/prompts' },
      { label: 'Policies', href: '/ai/policies' },
      { label: 'Integrations', href: '/ai/integrations' },
      { label: 'Settings', href: '/ai/settings' },
    ],
  },
];

function getActiveSection(pathname: string): SectionConfig {
  return (
    SECTIONS.find((section) =>
      section.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`))
    ) || SECTIONS[0]
  );
}

export function AIModuleLayout({
  children,
  initialMode,
  aiRoles,
}: {
  children: ReactNode;
  initialMode: AIExperienceMode;
  aiRoles: string[];
}) {
  const pathname = usePathname();
  const activeSection = useMemo(() => getActiveSection(pathname), [pathname]);
  const canUseAdvanced = aiRoles.includes('AI_ADMIN') || aiRoles.includes('AUTOMATION_DESIGNER');
  const [mode, setModeState] = useState<AIExperienceMode>('simple');
  const lastPatchSignature = useRef<string>('');
  
  const visibleSections = useMemo(
    () => SECTIONS.filter((section) => canUseAdvanced || section.key !== 'admin' || section.key === activeSection.key),
    [activeSection.key, canUseAdvanced]
  );

  const patchPreferences = async (patch: Record<string, unknown>) => {
    await fetch('/api/ai/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => null);
  };

  const setMode = (nextMode: AIExperienceMode) => {
    setModeState(nextMode);
  };

  useEffect(() => {
    const patch: Record<string, unknown> = {
      lastVisitedSection: activeSection.key,
    };

    if (pathname.startsWith('/ai/inbox')) {
      patch.onboardingChecklist = { reviewApprovalInbox: true };
    }

    const signature = JSON.stringify({ pathname, patch, mode });
    if (lastPatchSignature.current === signature) {
      return;
    }

    lastPatchSignature.current = signature;
    void patchPreferences(patch);
  }, [activeSection.key, mode, pathname]);

  return (
    <AIExperienceProvider value={{ mode, setMode, canUseAdvanced }}>
      <div className="space-y-5 px-1 pb-8 pt-4 md:px-4">
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">AI &amp; Automation</h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    A task-oriented workspace for approvals, automations, assistants, and governance without overwhelming daily operations.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <Button asChild className="h-9 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                    <Link href="/ai/workflows/new">New Automation</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-9 rounded-lg border-slate-200 bg-white">
                    <Link href="/ai/agents/new">New Assistant</Link>
                  </Button>
                  {canUseAdvanced ? (
                    <Button asChild variant="outline" className="h-9 rounded-lg border-slate-200 bg-white">
                      <Link href="/ai/policies">Policy Center</Link>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto border-t border-slate-200 pt-3 pb-1">
                {activeSection.children.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="px-4 py-4 md:px-6">
              <p className="mb-2 text-sm font-semibold text-slate-900">Command Hub</p>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleSections.map((section) => {
                  const isActive = section.key === activeSection.key;
                  const Icon = section.icon;

                  return (
                    <Link
                      key={section.key}
                      href={section.href}
                      className={cn(
                        'group rounded-xl border p-3 transition-all',
                        isActive
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                            isActive
                              ? 'border-blue-200 bg-white text-blue-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:text-slate-700'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn('text-sm font-semibold', isActive ? 'text-blue-900' : 'text-slate-900')}>
                            {section.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{section.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {children}
      </div>
    </AIExperienceProvider>
  );
}
