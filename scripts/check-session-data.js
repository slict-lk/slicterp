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

async function checkSessionData() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔍 Checking session data for user: ${email}\n`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tenantId: true,
            modulePermissions: true,
            // Check all possible module-related fields
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('User Info:');
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Tenant ID:', user.tenantId);
    
    console.log('\nUser Module Permissions (all keys):');
    const permissions = user.modulePermissions || {};
    Object.keys(permissions).forEach(moduleId => {
        console.log(`  ${moduleId}:`, JSON.stringify(permissions[moduleId]));
    });
    
    // Check tenant schema to see what fields exist
    console.log('\n🔍 Checking Tenant schema...');
    const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
            id: true,
            name: true,
            enabledModules: true,
            // Try other possible field names
        }
    });
    
    console.log('Tenant Info:');
    console.log('  Name:', tenant.name);
    console.log('  enabledModules:', tenant.enabledModules);
}

checkSessionData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
