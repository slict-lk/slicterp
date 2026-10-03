
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Inspecting Kamal (Store Manager) Permissions...\n');

    // 1. Find User
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'kamal', mode: 'insensitive' } },
        include: { userRole: true }
    });

    if (!user) {
        console.error('❌ User "Kamal" not found!');
        return;
    }

    console.log(`👤 User: ${user.name} (${user.id})`);
    console.log(`   Role Field: ${user.role}`);
    console.log(`   UserRoleId: ${user.userRoleId}`);

    // 2. Inspect Role
    if (user.userRole) {
        const role = user.userRole;
        console.log(`\n🏷️  Assigned Role: "${role.name}" (ID: ${role.id})`);

        const perms = role.permissions as any;
        const enabled = Object.keys(perms).filter(k => perms[k]?.enabled);

        console.log(`\n📊 Role Enabled Modules (${enabled.length}):`);
        enabled.forEach(k => {
            const p = perms[k];
            const actions = [];
            if (p.view) actions.push('view');
            if (p.create) actions.push('create');
            if (p.edit) actions.push('edit');
            if (p.delete) actions.push('delete');
            console.log(`   - ${k}: ${actions.join(', ')}`);
        });
    } else {
        console.log('❌ No DB Role assigned! (This is likely the issue)');

        // Suggest available Store Manager roles
        const roles = await prisma.role.findMany({
            where: {
                tenantId: user.tenantId,
                name: { contains: 'manager', mode: 'insensitive' }
            }
        });
        console.log('\n📋 Available Manager Roles:');
        roles.forEach(r => console.log(`   - ${r.name} (${r.id})`));
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
