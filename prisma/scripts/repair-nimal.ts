
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🛠️  Starting Repair for Nimal Perera...\n');

    // 1. Find User
    const user = await prisma.user.findFirst({
        where: {
            email: { contains: 'nimal', mode: 'insensitive' }
        },
        include: { userRole: true } // Use correct relation name
    });

    if (!user) {
        console.error('❌ User "Nimal" not found!');
        return;
    }

    console.log(`👤 Found User: ${user.name} (${user.id})`);

    let targetRole = user.userRole;

    // 2. If no role linked via relation, find it by name
    if (!targetRole) {
        console.log('   ⚠️  No userRole linked. Searching for "Cashier" role in tenant...');
        targetRole = await prisma.role.findFirst({
            where: {
                tenantId: user.tenantId,
                name: { contains: 'cashier', mode: 'insensitive' }
            }
        });
    }

    if (!targetRole) {
        console.error('❌ Could not find a suitable "Cashier" role to assign!');
        return;
    }

    console.log(`🏷️  Target Role: "${targetRole.name}" (ID: ${targetRole.id})`);
    console.log(`   Permissions: ${Object.keys(targetRole.permissions as any).length} items`);

    // 3. Update User
    await prisma.user.update({
        where: { id: user.id },
        data: {
            userRoleId: targetRole.id,
            role: targetRole.code as any, // Sync legacy code
            modulePermissions: targetRole.permissions as any
        }
    });

    console.log('\n✅ Repair Complete!');
    console.log('   - userRoleId updated');
    console.log('   - modulePermissions synced from Role');
    console.log('   -> Nimal should now see the sidebar correctly.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
