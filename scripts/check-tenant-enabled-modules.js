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

async function checkTenantEnabledModules() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔍 Checking tenant enabledModules for: ${email}\n`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            tenantId: true,
            tenant: {
                select: {
                    id: true,
                    name: true,
                    enabledModules: true,
                    // Check all possible module-related fields
                }
            }
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('=== TENANT INFO ===');
    console.log('Tenant ID:', user.tenant.id);
    console.log('Tenant Name:', user.tenant.name);
    
    console.log('\n=== TENANT ENABLED MODULES ===');
    console.log('enabledModules:', user.tenant.enabledModules);
    console.log('Type:', typeof user.tenant.enabledModules);
    console.log('Length:', user.tenant.enabledModules?.length);
    
    console.log('\n=== MODULE LIST ===');
    if (user.tenant.enabledModules && Array.isArray(user.tenant.enabledModules)) {
        user.tenant.enabledModules.forEach((module, index) => {
            console.log(`  ${index + 1}. ${module}`);
        });
    }
    
    console.log('\n=== HOTEL MODULE STATUS ===');
    const hasHotel = user.tenant.enabledModules?.includes('hotel');
    console.log('Hotel in tenant enabledModules:', hasHotel);
    
    if (hasHotel) {
        console.log('\n❌ FOUND ISSUE: Hotel is in tenant enabledModules');
        console.log('This causes hotel to show in sidebar even if user permissions dont have it');
        console.log('Solution: Remove hotel from tenant.enabledModules');
    } else {
        console.log('\n✅ Hotel is NOT in tenant enabledModules');
    }
}

checkTenantEnabledModules()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
