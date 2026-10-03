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

async function clearHotelPermissions() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🗑️  Completely removing hotel module from permissions for: ${email}\n`);

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

    const currentPermissions = user.modulePermissions || {};
    
    if (currentPermissions.hotel) {
        const { hotel, ...remainingPermissions } = currentPermissions;

        await prisma.user.update({
            where: { id: user.id },
            data: { modulePermissions: remainingPermissions }
        });

        console.log('✅ Hotel module completely removed from permissions');
        console.log('   Removed:', hotel);
        console.log('   Remaining modules:', Object.keys(remainingPermissions).length);
    } else {
        console.log('ℹ️  Hotel module was not in permissions');
    }
}

clearHotelPermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
