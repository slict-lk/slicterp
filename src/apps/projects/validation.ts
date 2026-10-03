import { z } from 'zod';

const nullableDate = z.string().datetime().or(z.string().date()).nullable().optional();

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  templateKey: z.string().trim().default('GENERAL'),
  visibility: z.enum(['PRIVATE', 'TENANT']).default('PRIVATE'),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  startDate: nullableDate,
  endDate: nullableDate,
  budget: z.coerce.number().min(0).nullable().optional(),
  currency: z.string().trim().length(3).default('LKR'),
  customerId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  billingType: z.enum(['INTERNAL', 'TIME_AND_MATERIALS', 'FIXED_MILESTONE']).default('INTERNAL'),
  defaultBillingRate: z.coerce.number().min(0).nullable().optional(),
  defaultCostRate: z.coerce.number().min(0).nullable().optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  version: z.number().int().positive().optional(),
  archived: z.boolean().optional(),
});

export const workItemCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(2).max(240),
  description: z.string().max(20000).nullable().optional(),
  type: z.enum(['TASK', 'TODO', 'BUG', 'ISSUE', 'FEATURE', 'REQUEST', 'RISK', 'APPROVAL']).default('TASK'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED']).default('TODO'),
  workflowStatusKey: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  reporterId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).nullable().optional(),
  storyPoints: z.coerce.number().min(0).max(100).nullable().optional(),
  startDate: nullableDate,
  dueDate: nullableDate,
  estimatedHours: z.coerce.number().min(0).nullable().optional(),
  environment: z.string().max(500).nullable().optional(),
  reproductionSteps: z.string().max(10000).nullable().optional(),
  expectedResult: z.string().max(5000).nullable().optional(),
  actualResult: z.string().max(5000).nullable().optional(),
  releaseVersion: z.string().max(100).nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  acceptanceCriteria: z.string().max(10000).nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const workItemUpdateSchema = workItemCreateSchema.omit({ projectId: true }).partial().extend({
  version: z.number().int().positive().optional(),
  archived: z.boolean().optional(),
});

export const commentCreateSchema = z.object({ body: z.string().trim().min(1).max(10000) });
export const checklistCreateSchema = z.object({ title: z.string().trim().min(1).max(500) });
export const sprintCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  goal: z.string().max(2000).nullable().optional(),
  startDate: nullableDate,
  endDate: nullableDate,
});
