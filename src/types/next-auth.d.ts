import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' | string;
            isSuperAdmin: boolean;
            tenantId: string;
            tenant?: string;
            enabledModuleIds: string[];
            tenantModules?: string[];
            modulePermissions?: any;
            employee?: any;
            trialEnd?: string | null;
            plan?: string;
        } & DefaultSession['user'];
    }

    interface User extends DefaultUser {
        role: string;
        isSuperAdmin: boolean;
        tenantId: string;
        tenant?: any;
        modulePermissions?: any;
        enabledModuleIds?: string[];
        employee?: any;
        trialEnd?: string | null;
        plan?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: string;
        isSuperAdmin: boolean;
        tenantId: string;
        tenant?: any;
        enabledModuleIds?: string[];
        tenantModules?: string[];
        modulePermissions?: any;
        employee?: any;
        trialEnd?: string | null;
        plan?: string;
    }
}
