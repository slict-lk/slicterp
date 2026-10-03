import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isProxyAuthorizedPath } from '@/lib/middleware-auth';

// Map routes to module IDs
const ROUTE_TO_MODULE_ID_MAP: Record<string, string> = {
  '/crm': 'crm',
  '/sales': 'sales',
  '/accounting': 'accounting',
  '/inventory': 'inventory',
  '/hr': 'hr',
  '/purchasing': 'purchasing',
  '/manufacturing': 'manufacturing',
  '/projects': 'projects',
  '/reports': 'reports',
  '/settings/users': 'users',
  '/settings': 'settings',
  '/contacts': 'contacts',
  '/subscriptions': 'subscriptions',
  '/quality': 'quality',
  '/marketing': 'marketing',
  '/blog': 'blog',
  '/surveys': 'surveys',
  '/helpdesk': 'helpdesk',
  '/pos': 'pos',
  '/cart': 'cart',
  '/loyalty': 'loyalty',
  '/properties': 'properties',
  '/agents': 'agents',
  '/healthcare': 'healthcare',
  '/hotel': 'hotel',
  '/restaurant': 'restaurant',
  '/livechat': 'livechat',
  '/sms': 'sms',
  '/calendar': 'calendar',
  '/courses': 'courses',
  '/knowledge': 'knowledge',
  '/forum': 'forum',
  '/presentations': 'presentations',
  '/automation': 'automation',
  '/integrations': 'integrations',
  '/studio': 'studio',
  '/ai': 'ai',
  '/intelligence': 'intelligence',
};

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const hostname = req.headers.get('host') || '';
    const rootAppHosts = ['apps.slict.lk', 'www.apps.slict.lk'];

    // --- Dynamic CORS Handling for Public API ---
    if (path.startsWith('/api/public')) {
      const origin = req.headers.get('origin');
      console.log(`[Middleware] ${req.method} ${path} | Origin: ${origin}`);

      const allowedOrigins = [
        'http://localhost:3001',
        'https://spareparts.slict.lk',
        'https://www.spareparts.slict.lk',
        'http://localhost:3000'
      ];

      // Prepare response (handle preflight or standard request)
      let res = NextResponse.next();

      if (req.method === 'OPTIONS') {
        res = new NextResponse(null, { status: 200 });
      }

      // Allow if origin is in list OR if no origin (server-to-server/local)
      if (origin && allowedOrigins.includes(origin)) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      } else if (!origin) {
        // Fallback for non-browser requests or local testing
        res.headers.set('Access-Control-Allow-Origin', '*');
      }

      // Always set these for preflight
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Tenant-Subdomain, Authorization');


      if (req.method === 'OPTIONS') {
        return res;
      }

      // Pass through plain response with headers attached
      return res;
    }
    // ---------------------------------------------

    // Tenant subdomain handling
    const hostParts = hostname.split('.');
    const requestHeaders = new Headers(req.headers);

    if (hostname.includes('localhost')) {
      const subdomain = hostParts[0].split(':')[0];
      requestHeaders.set('x-tenant-subdomain', subdomain);
    } else if (rootAppHosts.includes(hostname)) {
      // Main application host: do not treat it as a tenant subdomain.
      requestHeaders.delete('x-tenant-subdomain');
    } else if (hostParts.length >= 3) {
      const subdomain = hostParts[0];
      const reserved = ['www', 'api', 'admin', 'app', 'apps'];
      if (!reserved.includes(subdomain)) {
        requestHeaders.set('x-tenant-subdomain', subdomain);
      }
    }

    // Super Admin bypass
    if (token?.isSuperAdmin) {
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Trial expiration check
    if (token?.plan === 'trial' && token?.trialEnd) {
      const trialEndDate = new Date(token.trialEnd as string);
      const now = new Date();

      if (trialEndDate < now) {
        // Allow access to trial-expired page, billing, auth, and API routes
        const allowedPaths = ['/trial-expired', '/settings/billing', '/api/auth', '/login', '/register'];
        const isAllowed = allowedPaths.some(p => path.startsWith(p));

        if (!isAllowed) {
          return NextResponse.redirect(new URL('/trial-expired', req.url));
        }
      }
    }

     // Check module permissions - use tenant's enabledModules from token
     const enabledModuleIds = (token?.enabledModuleIds as string[]) || [];
     const tenantModuleIds = (token?.tenantModules as string[]) || [];
     // Use tenant modules if available, otherwise fall back to user's enabledModuleIds
     const effectiveModules = tenantModuleIds.length > 0 ? tenantModuleIds : enabledModuleIds;

     for (const [route, moduleId] of Object.entries(ROUTE_TO_MODULE_ID_MAP)) {
       if (path.startsWith(route)) {
         // Dashboard is always accessible
         if (moduleId === 'dashboard') continue;

         if (moduleId === 'intelligence') {
           if (!effectiveModules.includes('intelligence') && !effectiveModules.includes('ai')) {
             return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
           }
           break;
         }

         if (!effectiveModules.includes(moduleId)) {
           return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
         }
         break;
       }
     }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        return isProxyAuthorizedPath(req.nextUrl.pathname, token);
      },
    },
  }
);

export const config = {
  matcher: [
    // Include api/public in matcher so middleware runs for it
    '/((?!api/auth|_next/|_static/|login|register|trial-expired|favicon.ico|$).*)',
  ],
};
