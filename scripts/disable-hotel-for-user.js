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

async function disableHotelForUser() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔧 Disabling hotel module for user: ${email}\n`);

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
        const updatedPermissions = {
            ...currentPermissions,
            hotel: {
                ...currentPermissions.hotel,
                enabled: false,
                view: false,
                create: false,
                edit: false,
                delete: false
            }
        };

        await prisma.user.update({
            where: { id: user.id },
            data: { modulePermissions: updatedPermissions }
        });

        console.log('✅ Hotel module disabled for user');
        console.log('   Previous state:', currentPermissions.hotel);
        console.log('   New state:', updatedPermissions.hotel);
    } else {
        console.log('ℹ️  Hotel module was not defined in permissions');
    }
}

disableHotelForUser()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
