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

async function syncHotelPermissions() {
    console.log('🔄 Syncing hotel module permissions for all ADMIN users...\n');

    // Find all admin users
    const users = await prisma.user.findMany({
        where: {
            role: 'ADMIN'
        },
        select: {
            id: true,
            email: true,
            name: true,
            tenantId: true,
            modulePermissions: true,
            role: true
        }
    });

    console.log(`Found ${users.length} admin users.\n`);

    for (const user of users) {
        const currentPermissions = user.modulePermissions || {};

        // Check if hotel permission is missing or disabled
        if (!currentPermissions.hotel || !currentPermissions.hotel.enabled) {
            console.log(`📝 Updating: ${user.email}`);

            const updatedPermissions = {
                ...currentPermissions,
                hotel: { enabled: true, read: true, write: true, view: true, create: true, edit: true, delete: true }
            };

            await prisma.user.update({
                where: { id: user.id },
                data: { modulePermissions: updatedPermissions }
            });

            console.log(`   ✅ Added hotel permissions`);
        } else {
            console.log(`⏭️  Skipping: ${user.email} (already has hotel permissions)`);
        }
    }

    console.log('\n✅ Done!');
}

syncHotelPermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
