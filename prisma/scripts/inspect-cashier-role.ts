
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Inspecting Cashier Role Permissions...\n');

    // Find the role assigned to Nimal
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'nimal', mode: 'insensitive' } },
        include: { userRole: true }
    });

    if (!user || !user.userRole) {
        console.error('❌ Nimal or his role not found.');
        return;
    }

    const role = user.userRole;
    console.log(`🏷️  Role: "${role.name}" (ID: ${role.id})`);

    const perms = role.permissions as any;
    const enabled = Object.keys(perms).filter(k => perms[k]?.enabled);

    console.log(`\n📊 Enabled Modules (${enabled.length}):`);
    enabled.forEach(k => {
        const p = perms[k];
        const actions = [];
        if (p.view) actions.push('view');
        if (p.create) actions.push('create');
        if (p.edit) actions.push('edit');
        if (p.delete) actions.push('delete');
        console.log(`   - ${k}: ${actions.join(', ')}`);
    });

}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
