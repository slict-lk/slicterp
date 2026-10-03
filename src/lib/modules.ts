/**
 * Central Module Configuration
 * This file defines all available modules in the ERP system.
 * When a new module is added to the system, add it here to automatically
 * generate permissions for users.
 */

export interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  route?: string;
  permissions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    export?: boolean;
    import?: boolean;
    approve?: boolean;
  };
}

export interface ModuleCategory {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface ModulePermissionValue {
  enabled: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
  import?: boolean;
  approve?: boolean;
}

export type ModulePermissions = Record<string, ModulePermissionValue>;

// Module Categories
export const MODULE_CATEGORIES: ModuleCategory[] = [
  { id: 'core', name: 'Core', description: 'Core system modules', order: 1 },
  { id: 'sales', name: 'Sales & CRM', description: 'Sales and customer relationship management', order: 2 },
  { id: 'finance', name: 'Finance', description: 'Financial management', order: 3 },
  { id: 'operations', name: 'Operations', description: 'Operations and inventory', order: 4 },
  { id: 'hr', name: 'Human Resources', description: 'HR and employee management', order: 5 },
  { id: 'projects', name: 'Projects', description: 'Project management', order: 6 },
  { id: 'marketing', name: 'Marketing', description: 'Marketing and campaigns', order: 7 },
  { id: 'services', name: 'Services', description: 'Service management', order: 8 },
  { id: 'ecommerce', name: 'E-Commerce', description: 'Online sales and shopping', order: 9 },
  { id: 'realestate', name: 'Real Estate', description: 'Property management', order: 10 },
  { id: 'healthcare', name: 'Healthcare', description: 'Healthcare management', order: 11 },
  { id: 'hospitality', name: 'Hospitality', description: 'Hotel and restaurant management', order: 12 },
  { id: 'communication', name: 'Communication', description: 'Communication tools', order: 13 },
  { id: 'productivity', name: 'Productivity', description: 'Productivity tools', order: 14 },
  { id: 'automation', name: 'Automation', description: 'Automation and workflows', order: 15 },
];

// All Available Modules - ADD NEW MODULES HERE
export const AVAILABLE_MODULES: Module[] = [
  // Core Modules
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard and analytics',
    category: 'core',
    icon: 'LayoutDashboard',
    route: '/dashboard',
    permissions: { view: true, create: false, edit: false, delete: false },
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'System settings and configuration',
    category: 'core',
    icon: 'Settings',
    route: '/settings',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'users',
    name: 'Users',
    description: 'User management',
    category: 'core',
    icon: 'Users',
    route: '/settings/users',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'audit',
    name: 'Audit Logs',
    description: 'System audit and activity logs',
    category: 'core',
    icon: 'FileText',
    route: '/audit',
    permissions: { view: true, create: false, edit: false, delete: false, export: true },
  },

  // Sales & CRM
  {
    id: 'crm',
    name: 'CRM',
    description: 'Lead, opportunity, pipeline, and customer relationship management',
    category: 'sales',
    icon: 'Target',
    route: '/crm',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Sales orders and quotations',
    category: 'sales',
    icon: 'ShoppingCart',
    route: '/sales',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
  },
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'Customer and vendor contacts',
    category: 'sales',
    icon: 'Users',
    route: '/contacts',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, import: true },
  },

  // Finance
  {
    id: 'accounting',
    name: 'Accounting',
    description: 'Financial accounting',
    category: 'finance',
    icon: 'DollarSign',
    route: '/accounting',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
  },
  {
    id: 'purchasing',
    name: 'Purchasing',
    description: 'Purchase orders and vendor management',
    category: 'finance',
    icon: 'ShoppingBag',
    route: '/purchasing',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    description: 'Subscription management',
    category: 'finance',
    icon: 'CreditCard',
    route: '/subscriptions',
    permissions: { view: true, create: true, edit: true, delete: true },
  },

  // Operations
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Inventory and stock management',
    category: 'operations',
    icon: 'Package',
    route: '/inventory',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, import: true },
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Manufacturing operations',
    category: 'operations',
    icon: 'Factory',
    route: '/manufacturing',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'quality',
    name: 'Quality',
    description: 'Quality management',
    category: 'operations',
    icon: 'CheckCircle',
    route: '/quality',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Automotive parts, fitment search, and shop floor management',
    category: 'operations',
    icon: 'Wrench',
    route: '/automotive',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, import: true },
  },
  {
    id: 'spareparts',
    name: 'Spare Parts Shop',
    description: 'Complete spare parts retail management with POS, customers, promotions, and reordering',
    category: 'operations',
    icon: 'Store',
    route: '/spareparts',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, import: true },
  },
  {
    id: 'vehicle-export',
    name: 'Vehicle Export',
    description: 'Japan vehicle export trading, compliance, and logistics management',
    category: 'operations',
    icon: 'Ship',
    route: '/vehicle-export',
    permissions: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
  },

  // Human Resources
  {
    id: 'hr',
    name: 'HR',
    description: 'Human resources management',
    category: 'hr',
    icon: 'Briefcase',
    route: '/hr',
    permissions: { view: true, create: true, edit: true, delete: true, export: true },
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Employee attendance tracking',
    category: 'hr',
    icon: 'Clock',
    route: '/hr/attendance',
    permissions: { view: true, create: true, edit: true, delete: true, export: true },
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Payroll processing',
    category: 'hr',
    icon: 'DollarSign',
    route: '/hr/payroll',
    permissions: { view: true, create: true, edit: true, delete: true, approve: true },
  },

  // Projects
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project management',
    category: 'projects',
    icon: 'FolderKanban',
    route: '/projects',
    permissions: { view: true, create: true, edit: true, delete: true, approve: true, export: true, import: true },
  },

  // Marketing
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Marketing campaigns',
    category: 'marketing',
    icon: 'Megaphone',
    route: '/marketing',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'blog',
    name: 'Blog',
    description: 'Blog and content management',
    category: 'marketing',
    icon: 'FileText',
    route: '/blog',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'surveys',
    name: 'Surveys',
    description: 'Survey management',
    category: 'marketing',
    icon: 'ClipboardList',
    route: '/surveys',
    permissions: { view: true, create: true, edit: true, delete: true },
  },

  // Services
  {
    id: 'helpdesk',
    name: 'Helpdesk',
    description: 'Support ticket management',
    category: 'services',
    icon: 'Headphones',
    route: '/helpdesk',
    permissions: { view: true, create: true, edit: true, delete: true },
  },

  // E-Commerce
  {
    id: 'pos',
    name: 'Point of Sale',
    description: 'Point of sale system',
    category: 'ecommerce',
    icon: 'CreditCard',
    route: '/pos',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'cart',
    name: 'Shopping Cart',
    description: 'Shopping cart management',
    category: 'ecommerce',
    icon: 'ShoppingCart',
    route: '/cart',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'loyalty',
    name: 'Loyalty Programs',
    description: 'Customer loyalty programs',
    category: 'ecommerce',
    icon: 'Gift',
    route: '/loyalty',
    permissions: { view: true, create: true, edit: true, delete: true },
  },

  // Real Estate
  {
    id: 'properties',
    name: 'Real Estate',
    description: 'Property management, listings, and agent tracking',
    category: 'realestate',
    icon: 'Home',
    route: '/real-estate',
    permissions: { view: true, create: true, edit: true, delete: true, export: true },
  },
  {
    id: 'agents',
    name: 'Agents',
    description: 'Real estate agent management',
    category: 'realestate',
    icon: 'UserCheck',
    route: '/agents',
    permissions: { view: true, create: true, edit: true, delete: true },
  },



  // Hospitality
  {
    id: 'hotel',
    name: 'Hotel',
    description: 'Hotel management',
    category: 'hospitality',
    icon: 'Building',
    route: '/hotel',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Restaurant management',
    category: 'hospitality',
    icon: 'UtensilsCrossed',
    route: '/restaurant',
    permissions: { view: true, create: true, edit: true, delete: true },
  },

  // Communication
  {
    id: 'livechat',
    name: 'Live Chat',
    description: 'Live chat support',
    category: 'communication',
    icon: 'MessageSquare',
    route: '/livechat',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'SMS messaging',
    category: 'communication',
    icon: 'Phone',
    route: '/sms',
    permissions: { view: true, create: true, edit: true, delete: true },
  },

  // Productivity
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Calendar and events',
    category: 'productivity',
    icon: 'Calendar',
    route: '/calendar',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'courses',
    name: 'Courses',
    description: 'Course management',
    category: 'productivity',
    icon: 'GraduationCap',
    route: '/courses',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    description: 'Knowledge base management',
    category: 'productivity',
    icon: 'BookOpen',
    route: '/knowledge',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'forum',
    name: 'Forum',
    description: 'Discussion forums',
    category: 'productivity',
    icon: 'MessagesSquare',
    route: '/forum',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'presentations',
    name: 'Presentations',
    description: 'Presentation management',
    category: 'productivity',
    icon: 'Presentation',
    route: '/presentations',
    permissions: { view: true, create: true, edit: true, delete: true },
  },

  // Automation
  {
    id: 'automation',
    name: 'Automation',
    description: 'Workflow automation',
    category: 'automation',
    icon: 'Workflow',
    route: '/automation',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Third-party integrations',
    category: 'automation',
    icon: 'Puzzle',
    route: '/integrations',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Application customization studio',
    category: 'automation',
    icon: 'Code',
    route: '/studio',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'ai',
    name: 'AI Assistant',
    description: 'AI-powered features',
    category: 'automation',
    icon: 'Brain',
    route: '/ai',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'intelligence',
    name: 'Organizational Intelligence',
    description: 'Decision intelligence, readiness, workforce analytics, constraints, simulation, and governed recommendations',
    category: 'automation',
    icon: 'Target',
    route: '/intelligence',
    permissions: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
  },

  // Healthcare (QuickCare)
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Healthcare management dashboard',
    category: 'healthcare',
    icon: 'Heart',
    route: '/healthcare',
    permissions: { view: true, create: true, edit: true, delete: true },
  },
  {
    id: 'healthcare_reception',
    name: 'Reception',
    description: 'Patient registration and token issuance',
    category: 'healthcare',
    icon: 'UserPlus',
    route: '/healthcare/reception',
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    id: 'healthcare_doctor',
    name: 'Doctor Consultation',
    description: 'Patient consultations and prescriptions',
    category: 'healthcare',
    icon: 'Stethoscope',
    route: '/healthcare/consultation',
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    id: 'healthcare_pharmacy',
    name: 'Pharmacy',
    description: 'Medication dispensing',
    category: 'healthcare',
    icon: 'Pill',
    route: '/healthcare/pharmacy',
    permissions: { view: true, create: false, edit: true, delete: false },
  },
  {
    id: 'healthcare_lab',
    name: 'Laboratory',
    description: 'Lab orders and results',
    category: 'healthcare',
    icon: 'TestTube',
    route: '/healthcare/lab',
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    id: 'healthcare_admission',
    name: 'Admissions (IPD)',
    description: 'Inpatient management and bed allocation',
    category: 'healthcare',
    icon: 'Bed',
    route: '/healthcare/admission',
    permissions: { view: true, create: true, edit: true, delete: false },
  },
  {
    id: 'healthcare_nursing',
    name: 'Nursing Station',
    description: 'Ward care and vitals recording',
    category: 'healthcare',
    icon: 'HeartPulse',
    route: '/healthcare/nursing',
    permissions: { view: true, create: true, edit: true, delete: false },
  },
];

/**
 * Get all modules
 */
export function getAllModules(): Module[] {
  return AVAILABLE_MODULES;
}

/**
 * Get modules by category
 */
export function getModulesByCategory(categoryId: string): Module[] {
  return AVAILABLE_MODULES.filter(module => module.category === categoryId);
}

/**
 * Get module by ID
 */
export function getModuleById(moduleId: string): Module | undefined {
  return AVAILABLE_MODULES.find(module => module.id === moduleId);
}

/**
 * Get all module IDs
 */
export function getAllModuleIds(): string[] {
  return AVAILABLE_MODULES.map(module => module.id);
}

/**
 * Generate default module permissions for a user
 * Returns an object with module IDs as keys and permission objects as values
 */
export function generateDefaultModulePermissions(role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' = 'USER'): ModulePermissions {
  const permissions: ModulePermissions = {};

  AVAILABLE_MODULES.forEach(module => {
    switch (role) {
      case 'ADMIN':
        // Admins get all permissions
        permissions[module.id] = {
          enabled: true,
          view: module.permissions.view,
          create: module.permissions.create,
          edit: module.permissions.edit,
          delete: module.permissions.delete,
          export: module.permissions.export || false,
          import: module.permissions.import || false,
          approve: module.permissions.approve || false,
        };
        break;

      case 'MANAGER':
        // Managers get view, create, edit permissions but limited delete
        permissions[module.id] = {
          enabled: true,
          view: module.permissions.view,
          create: module.permissions.create,
          edit: module.permissions.edit,
          delete: false,
          export: module.permissions.export || false,
          import: module.permissions.import || false,
          approve: false,
        };
        break;

      case 'USER':
        // Standard users get view and limited create/edit
        permissions[module.id] = {
          enabled: module.category !== 'core' || module.id === 'dashboard', // Enable all non-core modules + dashboard
          view: module.permissions.view,
          create: false,
          edit: false,
          delete: false,
          export: false,
          import: false,
          approve: false,
        };
        break;

      case 'VIEWER':
        // Viewers get only view permissions
        permissions[module.id] = {
          enabled: module.id === 'dashboard',
          view: true,
          create: false,
          edit: false,
          delete: false,
          export: false,
          import: false,
          approve: false,
        };
        break;
    }
  });

  return permissions;
}

/**
 * Sync module permissions - adds missing modules to existing permission object
 * Useful when new modules are added to the system
 */
export function syncModulePermissions(
  existingPermissions: Record<string, unknown>,
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' = 'USER'
): ModulePermissions {
  const defaultPermissions = generateDefaultModulePermissions(role);
  const synced = { ...existingPermissions } as ModulePermissions;

  // Add new modules that don't exist in current permissions
  AVAILABLE_MODULES.forEach(module => {
    if (!synced[module.id]) {
      synced[module.id] = defaultPermissions[module.id];
    }
  });

  return synced;
}

/**
 * Check if a user has permission for a specific module action
 */
export function hasModulePermission(
  modulePermissions: Record<string, unknown>,
  moduleId: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve'
): boolean {
  const permission = modulePermissions[moduleId] as ModulePermissionValue | undefined;
  if (!permission || !permission.enabled) {
    return false;
  }
  return permission[action] === true;
}

/**
 * Get enabled modules for a user
 */
export function getEnabledModules(modulePermissions: Record<string, unknown>): Module[] {
  return AVAILABLE_MODULES.filter(module => {
    const permission = modulePermissions[module.id] as ModulePermissionValue | undefined;
    return permission && permission.enabled;
  });
}

/**
 * Get all valid permission strings from modules
 * @param enabledModuleIds Optional list of enabled module IDs to filter by
 */
export function getAllPermissions(enabledModuleIds?: string[]): string[] {
  const permissions: string[] = [];

  AVAILABLE_MODULES.forEach(module => {
    // If enabledModuleIds is provided, skip modules that are not in the list
    // Always include 'dashboard' and 'settings' as they are core
    if (enabledModuleIds &&
      !enabledModuleIds.includes(module.id) &&
      !['dashboard', 'settings', 'users', 'audit'].includes(module.id)) {
      return;
    }

    if (module.permissions.view) permissions.push(`${module.id}:view`);
    if (module.permissions.create) permissions.push(`${module.id}:create`);
    if (module.permissions.edit) permissions.push(`${module.id}:edit`);
    if (module.permissions.delete) permissions.push(`${module.id}:delete`);
    if (module.permissions.export) permissions.push(`${module.id}:export`);
    if (module.permissions.import) permissions.push(`${module.id}:import`);
    if (module.permissions.approve) permissions.push(`${module.id}:approve`);
  });

  return permissions;
}

