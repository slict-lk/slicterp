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

async function verifyHotelRemoved() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔍 Verifying hotel module is completely removed for: ${email}\n`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            modulePermissions: true
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    const permissions = user.modulePermissions || {};
    
    console.log('Checking if hotel exists in permissions:');
    if (permissions.hotel) {
        console.log('❌ Hotel module still exists in permissions:');
        console.log(JSON.stringify(permissions.hotel, null, 2));
    } else {
        console.log('✅ Hotel module does NOT exist in permissions');
    }
    
    console.log('\nTotal modules in permissions:', Object.keys(permissions).length);
    console.log('Module IDs:', Object.keys(permissions).sort().join(', '));
}

verifyHotelRemoved()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
