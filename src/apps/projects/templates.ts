export type ProjectTemplateDefinition = {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  workItemTypes: string[];
  workflow: Array<{ key: string; name: string; category: string; color: string }>;
  features: { sprints: boolean; budgets: boolean; timesheets: boolean };
};

const STANDARD_WORKFLOW = [
  { key: 'TODO', name: 'To do', category: 'TODO', color: '#64748b' },
  { key: 'IN_PROGRESS', name: 'In progress', category: 'IN_PROGRESS', color: '#2563eb' },
  { key: 'REVIEW', name: 'Review', category: 'REVIEW', color: '#d97706' },
  { key: 'DONE', name: 'Done', category: 'DONE', color: '#059669' },
];

export const PROJECT_TEMPLATES: ProjectTemplateDefinition[] = [
  {
    key: 'GENERAL',
    name: 'General Business Project',
    description: 'Plan and deliver everyday business work.',
    category: 'Business',
    icon: 'Briefcase',
    workItemTypes: ['TASK', 'TODO', 'REQUEST', 'RISK', 'APPROVAL'],
    workflow: STANDARD_WORKFLOW,
    features: { sprints: false, budgets: true, timesheets: true },
  },
  {
    key: 'SOFTWARE',
    name: 'Software Delivery',
    description: 'Manage features, bugs, issues, backlog, and sprints.',
    category: 'Technology',
    icon: 'Code2',
    workItemTypes: ['TASK', 'TODO', 'BUG', 'ISSUE', 'FEATURE', 'REQUEST'],
    workflow: [
      ...STANDARD_WORKFLOW.slice(0, 2),
      { key: 'TESTING', name: 'Testing', category: 'REVIEW', color: '#7c3aed' },
      ...STANDARD_WORKFLOW.slice(2),
    ],
    features: { sprints: true, budgets: true, timesheets: true },
  },
  {
    key: 'CLIENT_IMPLEMENTATION',
    name: 'Client Implementation',
    description: 'Coordinate customer onboarding and delivery milestones.',
    category: 'Delivery',
    icon: 'Handshake',
    workItemTypes: ['TASK', 'REQUEST', 'RISK', 'APPROVAL'],
    workflow: STANDARD_WORKFLOW,
    features: { sprints: false, budgets: true, timesheets: true },
  },
  {
    key: 'MARKETING',
    name: 'Marketing Campaign',
    description: 'Coordinate campaign planning, creative work, and approvals.',
    category: 'Marketing',
    icon: 'Megaphone',
    workItemTypes: ['TASK', 'TODO', 'REQUEST', 'APPROVAL'],
    workflow: STANDARD_WORKFLOW,
    features: { sprints: false, budgets: true, timesheets: true },
  },
  {
    key: 'OPERATIONS',
    name: 'Operations Improvement',
    description: 'Resolve operational issues and track improvement work.',
    category: 'Operations',
    icon: 'Workflow',
    workItemTypes: ['TASK', 'ISSUE', 'RISK', 'APPROVAL'],
    workflow: STANDARD_WORKFLOW,
    features: { sprints: false, budgets: true, timesheets: true },
  },
  {
    key: 'EVENT',
    name: 'Event Planning',
    description: 'Manage event milestones, suppliers, and delivery tasks.',
    category: 'Events',
    icon: 'CalendarDays',
    workItemTypes: ['TASK', 'TODO', 'REQUEST', 'RISK', 'APPROVAL'],
    workflow: STANDARD_WORKFLOW,
    features: { sprints: false, budgets: true, timesheets: true },
  },
];

export function getProjectTemplate(key?: string | null) {
  return PROJECT_TEMPLATES.find((template) => template.key === key) ?? PROJECT_TEMPLATES[0];
}
