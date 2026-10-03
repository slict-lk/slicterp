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

async function checkRolePermissions() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔍 Checking role permissions for: ${email}\n`);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            userRoleId: true,
            userRole: {
                select: {
                    id: true,
                    name: true,
                    permissions: true
                }
            },
            modulePermissions: true
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('=== USER INFO ===');
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('User Role ID:', user.userRoleId);
    
    console.log('\n=== USER ROLE PERMISSIONS ===');
    if (user.userRole) {
        console.log('Role Name:', user.userRole.name);
        console.log('Role Permissions:', user.userRole.permissions);
        console.log('Permissions Type:', typeof user.userRole.permissions);
        
        if (user.userRole.permissions && Array.isArray(user.userRole.permissions)) {
            console.log('\nRole Permission List:');
            user.userRole.permissions.forEach((perm, index) => {
                console.log(`  ${index + 1}. ${perm}`);
            });
            
            const hasHotelPermission = user.userRole.permissions.some(perm => 
                perm.includes('hotel') || perm === 'hotel'
            );
            console.log('\nHas hotel-related permissions:', hasHotelPermission);
        }
    } else {
        console.log('No user role assigned');
    }
    
    console.log('\n=== USER MODULE PERMISSIONS ===');
    const userPerms = user.modulePermissions || {};
    console.log('Has hotel in user permissions:', !!userPerms.hotel);
    
    console.log('\n=== FINAL PERMISSIONS MERGE ===');
    console.log('Role permissions override user permissions');
    console.log('If role has hotel enabled, it will show even if user permissions dont');
}

checkRolePermissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
