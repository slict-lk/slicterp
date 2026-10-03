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

// Simulate the permission conversion logic from auth-options.ts
function convertPermissionsToModulePermissions(permissions) {
    const modulePermissions = {};
    
    if (!permissions || !Array.isArray(permissions)) {
        return modulePermissions;
    }
    
    permissions.forEach(perm => {
        if (typeof perm === 'string') {
            const parts = perm.split(':');
            if (parts.length >= 2) {
                const moduleId = parts[0];
                const action = parts[1];
                
                if (!modulePermissions[moduleId]) {
                    modulePermissions[moduleId] = {
                        enabled: true,
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                        export: false,
                        import: false,
                        approve: false
                    };
                }
                
                if (action === 'view') modulePermissions[moduleId].view = true;
                if (action === 'create') modulePermissions[moduleId].create = true;
                if (action === 'edit') modulePermissions[moduleId].edit = true;
                if (action === 'delete') modulePermissions[moduleId].delete = true;
                if (action === 'export') modulePermissions[moduleId].export = true;
                if (action === 'import') modulePermissions[moduleId].import = true;
                if (action === 'approve') modulePermissions[moduleId].approve = true;
            }
        }
    });
    
    return modulePermissions;
}

async function checkSessionConstruction() {
    const email = 'info.muba@gmail.com';
    
    console.log(`🔍 Simulating session construction for: ${email}\n`);

    const dbUser = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isSuperAdmin: true,
            tenantId: true,
            modulePermissions: true,
            userRole: {
                select: {
                    id: true,
                    name: true,
                    permissions: true
                }
            },
            tenant: {
                select: {
                    name: true,
                    companyName: true,
                    trialEnd: true,
                    plan: true,
                    enabledModules: true,
                }
            }
        }
    });

    if (!dbUser) {
        console.log('❌ User not found');
        return;
    }

    console.log('=== SIMULATING JWT CALLBACK LOGIC ===\n');
    
    // Step 1: Get role permissions
    const rolePermissions = dbUser.userRole?.permissions
        ? convertPermissionsToModulePermissions(dbUser.userRole.permissions)
        : {};
    console.log('Role Permissions:', Object.keys(rolePermissions));
    
    // Step 2: Get user permissions
    const userPermissions = dbUser.modulePermissions || {};
    console.log('User Permissions:', Object.keys(userPermissions));
    
    // Step 3: Merge permissions (role overrides user)
    const finalPermissions = { ...rolePermissions, ...userPermissions };
    console.log('Final Permissions:', Object.keys(finalPermissions));
    
    // Step 4: Create enabledModuleIds from finalPermissions
    const enabledModuleIds = Object.keys(finalPermissions).filter(key => finalPermissions[key]?.enabled);
    console.log('enabledModuleIds:', enabledModuleIds);
    
    // Step 5: Get tenant modules
    const tenantModules = dbUser.tenant?.enabledModules || [];
    console.log('tenantModules:', tenantModules);
    
    console.log('\n=== SESSION DATA THAT WILL BE SENT TO FRONTEND ===');
    console.log('enabledModuleIds:', enabledModuleIds);
    console.log('tenantModules:', tenantModules);
    console.log('modulePermissions:', undefined); // JWT sets this to undefined
    
    console.log('\n=== HOOK LOGIC (useModulePermissions) ===');
    console.log('effectiveModuleIds = tenantModules.length > 0 ? tenantModules : enabledModuleIds');
    const effectiveModuleIds = tenantModules.length > 0 ? tenantModules : enabledModuleIds;
    console.log('effectiveModuleIds:', effectiveModuleIds);
    
    console.log('\nSince modulePermissions is undefined, hook will build from effectiveModuleIds:');
    console.log('This will create permissions for each module in effectiveModuleIds');
    console.log('If hotel is in effectiveModuleIds, it will be enabled');
    
    if (effectiveModuleIds.includes('hotel')) {
        console.log('\n❌ FOUND ISSUE: Hotel is in effectiveModuleIds');
        console.log('This causes hotel to be enabled even though user permissions dont have it');
    } else {
        console.log('\n✅ Hotel is NOT in effectiveModuleIds');
    }
}

checkSessionConstruction()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
