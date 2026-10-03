
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🛠️  Creating & Assigning Store Manager Role for Kamal...\n');

    // 1. Find User to get Tenant ID
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'kamal', mode: 'insensitive' } }
    });

    if (!user) {
        console.error('❌ User "Kamal" not found!');
        return;
    }

    // 2. Define Store Manager Permissions
    // Sales: Full
    // Inventory: Full
    // Purchasing: Full
    // Reports: View
    // Settings: None (or view only)

    const permissions: any = {};

    // Helper
    const setPerm = (moduleId: string, view = false, edit = false) => {
        permissions[moduleId] = {
            enabled: true,
            view,
            create: edit,
            edit,
            delete: edit,
            export: edit,
            import: edit,
            approve: edit
        };
    };

    setPerm('dashboard', true, false);
    setPerm('sales', true, true);
    setPerm('contacts', true, true);
    setPerm('inventory', true, true); // Create/Edit products
    setPerm('purchasing', true, true); // Create POs
    setPerm('reports', true, false); // View reports
    setPerm('subscriptions', false, false); // No billing access
    setPerm('settings', false, false); // No system settings
    // Add other required modules as per owner guide if needed

    // 3. Create Role
    const roleName = 'Store Manager';

    // Check if exists first to avoid duplicate
    let role = await prisma.role.findFirst({
        where: {
            tenantId: user.tenantId,
            name: roleName
        }
    });

    if (role) {
        console.log(`⚠️  Role "${roleName}" already exists. Updating permissions...`);
        role = await prisma.role.update({
            where: { id: role.id },
            data: { permissions }
        });
    } else {
        console.log(`✨ Creating new role: "${roleName}"...`);
        role = await prisma.role.create({
            data: {
                name: roleName,
                code: 'STORE_MANAGER', // Custom code
                description: 'Manages sales, inventory, and purchasing.',
                tenantId: user.tenantId,
                permissions
            }
        });
    }

    // 4. Assign to Kamal
    console.log(`🔗 Assigning role to Kamal...`);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            userRoleId: role.id,
            role: 'STORE_MANAGER',
            modulePermissions: permissions
        }
    });

    console.log('\n✅ Repair Complete!');
    console.log(`   - Role "${role.name}" configured.`);
    console.log(`   - Assigned to ${user.name}.`);
    console.log(`   - Permissions synced.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
