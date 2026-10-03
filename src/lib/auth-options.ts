import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { compare } from 'bcryptjs';
import { convertPermissionsToModulePermissions } from './rbac';

const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',  // Use JWT for session management
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            tenant: true,
            userRole: true,
            // @ts-ignore
            employee: true,
          },
        });

        if (!user || !user.password || !user.isActive) {
          throw new Error('Invalid credentials');
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Determine user role: prioritize isSuperAdmin, then use database role field, default to USER
        const userRole = user.isSuperAdmin ? 'ADMIN' : (user.role || 'USER');

        // Merge Role permissions with User permissions
        const rolePermissions = user.userRole?.permissions
          ? convertPermissionsToModulePermissions(user.userRole.permissions as string[])
          : {};

        const userPermissions = (user.modulePermissions as Record<string, any>) || {};
        const mergedPermissions = { ...rolePermissions, ...userPermissions };

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: userRole,
          isSuperAdmin: user.isSuperAdmin,
          modulePermissions: mergedPermissions,
          tenantId: user.tenantId,
          tenant: user.tenant ?? null,
          employee: (user as any).employee,
          trialEnd: user.tenant?.trialEnd?.toISOString() || null,
          plan: user.tenant?.plan || 'starter',
          tenantModules: (user.tenant as any)?.enabledModules || [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign in, store user data in token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isSuperAdmin = user.isSuperAdmin || false;

        // Store only enabled module IDs to keep JWT small
        const permissions = (user.modulePermissions as Record<string, any>) || {};
        token.enabledModuleIds = Object.keys(permissions).filter(key => permissions[key]?.enabled);
        // Don't store full permissions in token — they'll be refreshed from DB
        token.modulePermissions = undefined;

        token.tenantId = user.tenantId as string;
        token.tenant =
          (user.tenant && typeof user.tenant === 'object' && 'name' in user.tenant
            ? user.tenant.name
            : user.tenant) as string | null;
        // Populate tenantModules from the tenant's enabledModules field
        token.tenantModules = (user as any).tenantModules
          || (user.tenant && typeof user.tenant === 'object' ? (user.tenant as any).enabledModules : null)
          || [];
        token.employee = user.employee;
        token.trialEnd = user.trialEnd || null;
        token.plan = user.plan || 'starter';
        token.lastUserSyncAt = Date.now();
      }

      // Refresh DB-backed auth state only when needed instead of on every session read.
      const now = Date.now();
      const lastUserSyncAt =
        typeof token.lastUserSyncAt === 'number' ? token.lastUserSyncAt : 0;
      const shouldRefreshUser =
        Boolean(token.id) &&
        !user &&
        (
          trigger === 'update' ||
          !token.role ||
          !token.enabledModuleIds ||
          now - lastUserSyncAt > TOKEN_REFRESH_INTERVAL_MS
        );

      if (shouldRefreshUser) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isSuperAdmin: true,
              tenantId: true,
              modulePermissions: true,
              userRole: true,
              // @ts-ignore
              employee: true,
              tenant: {
                select: {
                  name: true,
                  companyName: true,
                  trialEnd: true,
                  plan: true,
                  enabledModules: true,  // ← fetch tenant-level module list
                }
              }
            }
          });

          if (dbUser) {
            // Update token with fresh data from database
            const userRole = dbUser.isSuperAdmin ? 'ADMIN' : (dbUser.role || 'USER');
            token.role = userRole;
            token.isSuperAdmin = dbUser.isSuperAdmin || false;

            // Merge Role permissions with User permissions
            const rolePermissions = dbUser.userRole?.permissions
              ? convertPermissionsToModulePermissions(dbUser.userRole.permissions as string[])
              : {};
            const userPermissions = (dbUser.modulePermissions as Record<string, any>) || {};
            const finalPermissions = { ...rolePermissions, ...userPermissions };

            token.enabledModuleIds = Object.keys(finalPermissions).filter(key => finalPermissions[key]?.enabled);
            token.modulePermissions = undefined;

            token.tenantId = dbUser.tenantId;
            token.tenant = dbUser.tenant?.name ?? dbUser.tenant?.companyName ?? 'Default';
            // Refresh tenant-level enabled modules
            token.tenantModules = (dbUser.tenant as any)?.enabledModules || token.tenantModules || [];
            token.employee = (dbUser as any).employee;
            token.trialEnd = dbUser.tenant?.trialEnd?.toISOString() || null;
            token.plan = dbUser.tenant?.plan || 'starter';
            token.lastUserSyncAt = now;
          }
        } catch (error) {
          console.error('Error refreshing user data in JWT:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string | null) ?? null;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.enabledModuleIds = token.enabledModuleIds as string[];
        session.user.tenantModules = (token.tenantModules as string[]) || [];
        session.user.modulePermissions = token.modulePermissions as Record<string, any>;
        session.user.tenantId = token.tenantId as string;
        session.user.tenant = token.tenant as string;
        session.user.employee = token.employee;
        session.user.trialEnd = token.trialEnd as string | null;
        session.user.plan = token.plan as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Custom sign in page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

// Re-export for convenience
export { getServerSession } from 'next-auth';
