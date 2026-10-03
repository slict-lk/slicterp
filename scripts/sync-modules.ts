/**
 * sync-modules.ts
 * 
 * This utility ensures that all available modules in the system are present
 * in existing Role permission objects. When new modules are added to AVAILABLE_MODULES,
 * running this script will update all roles to include default permissions for the new modules.
 */

import { PrismaClient } from '@prisma/client';
import { AVAILABLE_MODULES } from '../src/lib/modules';

const prisma = new PrismaClient();

interface ModulePermission {
    enabled: boolean;
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    export?: boolean;
    import?: boolean;
    approve?: boolean;
}

async function syncModulesToRoles() {
    console.log('🔄 Starting Module Sync...');
    console.log(`📦 Available Modules: ${AVAILABLE_MODULES.length}`);

    const roles = await prisma.role.findMany();
    console.log(`👤 Found ${roles.length} roles to update`);

    let updatedCount = 0;

    for (const role of roles) {
        const currentPermissions = (role.permissions as unknown as Record<string, ModulePermission>) || {};
        let hasChanges = false;

        // Check each available module
        for (const module of AVAILABLE_MODULES) {
            if (!currentPermissions[module.id]) {
                // Module is missing from this role, add it with disabled permissions
                currentPermissions[module.id] = {
                    enabled: false,
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                    export: false,
                    import: false,
                    approve: false,
                };
                hasChanges = true;
                console.log(`  + Adding module "${module.id}" to role "${role.name}"`);
            }
        }

        if (hasChanges) {
            await prisma.role.update({
                where: { id: role.id },
                data: { permissions: currentPermissions as any },
            });
            updatedCount++;
        }
    }

    console.log(`\n✅ Sync Complete! Updated ${updatedCount} roles.`);
}

// Run the sync
syncModulesToRoles()
    .catch((e) => {
        console.error('❌ Sync failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
