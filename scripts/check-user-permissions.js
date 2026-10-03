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

async function checkUserPermissions() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔍 Checking permissions for user: ${email}\n`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tenantId: true,
            modulePermissions: true
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
    
    console.log('\nModule Permissions:');
    const permissions = user.modulePermissions || {};
    
    if (permissions.hotel) {
        console.log('  Hotel Module:');
        console.log('    Enabled:', permissions.hotel.enabled);
        console.log('    View:', permissions.hotel.view);
        console.log('    Create:', permissions.hotel.create);
        console.log('    Edit:', permissions.hotel.edit);
        console.log('    Delete:', permissions.hotel.delete);
    } else {
        console.log('  Hotel Module: ❌ NOT DEFINED');
    }

    // Check all enabled modules
    console.log('\nAll Enabled Modules:');
    Object.keys(permissions).forEach(moduleId => {
        if (permissions[moduleId].enabled) {
            console.log(`  ✅ ${moduleId}: enabled=${permissions[moduleId].enabled}, view=${permissions[moduleId].view}`);
        }
    });
}

checkUserPermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
