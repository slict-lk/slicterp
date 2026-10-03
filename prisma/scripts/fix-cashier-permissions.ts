
import { PrismaClient } from '@prisma/client';
import { AVAILABLE_MODULES, generateDefaultModulePermissions } from '../src/lib/modules';

const prisma = new PrismaClient();

async function main() {
    console.log('🛠️  Updating Cashier Role Permissions...\n');

    // 1. Find the Role
    // We use the ID found in previous step to be precise
    const roleId = 'cmkmrod9a0000cgulb6vwbljf';
    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
        console.error('❌ Role not found!');
        return;
    }

    console.log(`🏷️  Updating Role: "${role.name}"`);

    // 2. Define Strict Permissions
    // Start with clean slate (all disabled)
    const newPermissions = { ...role.permissions } as any;

    // Helper to disable all
    Object.keys(newPermissions).forEach(key => {
        newPermissions[key] = {
            enabled: false,
            view: false,
            create: false,
            edit: false,
            delete: false,
            export: false,
            import: false,
            approve: false
        };
    });

    // 3. Apply Specific Grants

    // Sales: View, Create, Edit (Drafts). NO DELETE.
    newPermissions['sales'] = {
        enabled: true,
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
        import: false,
        approve: false
    };
    newPermissions['contacts'] = { // Usually needed for sales
        enabled: true,
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false, // Prevent exporting customer list
        import: false,
        approve: false
    };

    // Inventory: View only (Search parts). NO CREATE/EDIT.
    newPermissions['inventory'] = {
        enabled: true,
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
        import: false,
        approve: false
    };

    // Dashboard: Usually needed to land somewhere
    newPermissions['dashboard'] = {
        enabled: true,
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
        import: false,
        approve: false
    };

    // 4. Update Role in DB
    await prisma.role.update({
        where: { id: roleId },
        data: { permissions: newPermissions }
    });

    console.log('✅ Role permissions updated successfully.');

    // 5. Sync Nimal (and any other user with this role)
    console.log('🔄 Syncing users with this role...');

    const usersToUpdate = await prisma.user.findMany({
        where: { userRoleId: roleId }
    });

    for (const user of usersToUpdate) {
        await prisma.user.update({
            where: { id: user.id },
            data: { modulePermissions: newPermissions }
        });
        console.log(`   - Synced user: ${user.name}`);
    }

    console.log('\n✨ Done! Nimal should now have restricted access.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
