require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

// Use the same database configuration as the app
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// Strip sslmode from URL
const url = new URL(connectionString);
url.searchParams.delete('sslmode');
const cleanedUrl = url.toString();

// SSL Configuration
let sslConfig = {
    rejectUnauthorized: false,
};

if (process.env.DISABLE_SSL_VERIFY === 'true') {
    sslConfig = false;
}

if (sslConfig && process.env.AIVEN_CA_CERT) {
    sslConfig.ca = process.env.AIVEN_CA_CERT;
    sslConfig.rejectUnauthorized = true;
}

const pool = new pg.Pool({
    connectionString: cleanedUrl,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: sslConfig,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function debugSidebarPermissions() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔍 Debugging sidebar permissions for: ${email}\n`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isSuperAdmin: true,
            tenantId: true,
            modulePermissions: true,
            tenant: {
                select: {
                    id: true,
                    name: true,
                    enabledModules: true,
                    // Check all possible module fields
                }
            }
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('=== USER INFO ===');
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Is Super Admin:', user.isSuperAdmin);
    console.log('Tenant ID:', user.tenantId);
    
    console.log('\n=== TENANT MODULES ===');
    console.log('Tenant Name:', user.tenant.name);
    console.log('enabledModules:', user.tenant.enabledModules);
    console.log('Has hotel in tenant modules:', user.tenant.enabledModules?.includes('hotel'));
    
    console.log('\n=== USER MODULE PERMISSIONS ===');
    const permissions = user.modulePermissions || {};
    console.log('Has hotel in user permissions:', !!permissions.hotel);
    if (permissions.hotel) {
        console.log('Hotel permissions:', JSON.stringify(permissions.hotel, null, 2));
    }
    
    console.log('\n=== SIDEBAR FILTERING LOGIC ===');
    console.log('canAccessNavigationItem logic:');
    console.log('  1. isSuperAdmin:', user.isSuperAdmin);
    console.log('  2. item.moduleId exists:', 'hotel' in permissions);
    console.log('  3. permission.enabled:', permissions.hotel?.enabled);
    console.log('  4. permission.view:', permissions.hotel?.view);
    
    console.log('\n=== EXPECTED BEHAVIOR ===');
    console.log('Hotel should be hidden because:');
    console.log('  - isSuperAdmin:', user.isSuperAdmin);
    console.log('  - hotel in permissions:', !!permissions.hotel);
    console.log('  - hotel.enabled:', permissions.hotel?.enabled);
    console.log('  - hotel.view:', permissions.hotel?.view);
    
    if (!user.isSuperAdmin && !permissions.hotel) {
        console.log('\n✅ CORRECT: Hotel should be HIDDEN');
    } else {
        console.log('\n❌ INCORRECT: Hotel might be VISIBLE');
    }
}

debugSidebarPermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
