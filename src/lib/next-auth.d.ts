import { User as PrismaUser } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      tenantId: string;
      tenant?: any;
      role: string | null;
      isSuperAdmin: boolean;
      enabledModuleIds: string[];
      tenantModules?: string[];
      modulePermissions?: Record<string, any>;
      employee?: any;
      image?: string | null;
      trialEnd?: string | null;
      plan?: string;
    };
  }

  interface User extends Partial<PrismaUser> {
    tenant?: any;
    role: string | null;
    isSuperAdmin: boolean;
    modulePermissions: Record<string, any>;
    employee?: any;
    trialEnd?: string | null;
    plan?: string;
  }

  interface AdapterUser extends User {
    id: string;
    email: string;
    emailVerified: Date | null;
  }
}

declare module '@auth/core/types' {
  interface AdapterUser {
    role: string | null;
    isSuperAdmin: boolean;
    tenantId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    tenantId: string;
    tenant?: string | null;
    role: string | null;
    isSuperAdmin: boolean;
    enabledModuleIds: string[];
    modulePermissions?: Record<string, any>;
    employee?: any;
    trialEnd?: string | null;
    plan?: string;
  }
}
