import { getAllPermissions, getModuleById } from '@/lib/modules';

describe('modules intelligence registration', () => {
  it('registers Organizational Intelligence as a module', () => {
    const module = getModuleById('intelligence');

    expect(module).toBeDefined();
    expect(module?.route).toBe('/intelligence');
  });

  it('generates intelligence permissions', () => {
    const permissions = getAllPermissions();

    expect(permissions).toContain('intelligence:view');
    expect(permissions).toContain('intelligence:edit');
    expect(permissions).toContain('intelligence:approve');
  });
});
