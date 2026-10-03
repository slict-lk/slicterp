import { getProjectTemplate, PROJECT_TEMPLATES } from './templates';
import { projectCreateSchema, workItemCreateSchema } from './validation';

describe('projects templates and validation', () => {
  it('keeps general business simple and enables software delivery controls only for software', () => {
    const general = getProjectTemplate('GENERAL');
    const software = getProjectTemplate('SOFTWARE');
    expect(general.features.sprints).toBe(false);
    expect(general.workItemTypes).not.toContain('BUG');
    expect(software.features.sprints).toBe(true);
    expect(software.workItemTypes).toContain('BUG');
    expect(software.workItemTypes).toContain('FEATURE');
  });

  it('provides unique stable template keys', () => {
    expect(new Set(PROJECT_TEMPLATES.map((template) => template.key)).size).toBe(PROJECT_TEMPLATES.length);
  });

  it('validates project codes and work item types', () => {
    expect(projectCreateSchema.parse({ name: 'ERP Delivery', code: 'ERP-2026' }).templateKey).toBe('GENERAL');
    expect(() => projectCreateSchema.parse({ name: 'ERP Delivery', code: 'bad code' })).toThrow();
    expect(workItemCreateSchema.parse({ projectId: 'project-1', title: 'Fix login', type: 'BUG' }).type).toBe('BUG');
  });
});
