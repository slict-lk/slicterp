jest.mock('@/lib/prisma', () => ({ prisma: {} }));

import { projectRoleAllows } from './access-policy';

describe('project access roles', () => {
  it('keeps viewers read-only', () => {
    expect(projectRoleAllows('VIEWER', 'view')).toBe(true);
    expect(projectRoleAllows('VIEWER', 'contribute')).toBe(false);
    expect(projectRoleAllows('VIEWER', 'manage')).toBe(false);
  });

  it('separates delivery, time approval, and billing authority', () => {
    expect(projectRoleAllows('CONTRIBUTOR', 'contribute')).toBe(true);
    expect(projectRoleAllows('CONTRIBUTOR', 'approve_time')).toBe(false);
    expect(projectRoleAllows('TIME_APPROVER', 'approve_time')).toBe(true);
    expect(projectRoleAllows('TIME_APPROVER', 'bill')).toBe(false);
    expect(projectRoleAllows('MANAGER', 'bill')).toBe(true);
  });
});
