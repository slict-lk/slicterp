
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting Deep Diagnostic for Nimal Perera...\n');

    // 1. Find User
    const user = await prisma.user.findFirst({
        where: {
            email: { contains: 'nimal', mode: 'insensitive' }
        },
        include: {
            tenant: true,
            userRole: true // Include the relation to check if it exists
        }
    });

    if (!user) {
        console.error('❌ User "Nimal" not found in database!');
        return;
    }

    console.log('👤 USER DETAILS:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tenant: ${user.tenant?.name} (${user.tenantId})`);
    console.log(`   Legacy Role Field: ${user.role}`);
    console.log(`   UserRoleId Field: ${user.userRoleId}`);
    console.log(`   Is Active: ${user.isActive}`);

    // 2. Inspect Module Permissions on User
    console.log('\n🔒 USER MODULE PERMISSIONS (Raw JSON on User Record):');
    const userPerms = user.modulePermissions as any;
    if (!userPerms || Object.keys(userPerms).length === 0) {
        console.log('   ⚠️  EMPTY or NULL');
    } else {
        const enabledModules = Object.keys(userPerms).filter(k => userPerms[k]?.enabled);
        console.log(`   Total Modules in JSON: ${Object.keys(userPerms).length}`);
        console.log(`   Enabled Modules: ${enabledModules.length}`);
        if (enabledModules.length > 0) {
            console.log(`   List: ${enabledModules.join(', ')}`);
        } else {
            console.log('   ⚠️  JSON exists but NO modules are enabled!');
        }
    }

    // 3. Inspect Assigned Role
    if (user.userRoleId) {
        const role = await prisma.role.findUnique({
            where: { id: user.userRoleId }
        });

        if (role) {
            console.log(`\n🏷️  ASSIGNED ROLE DETAILS:`);
            console.log(`   ID: ${role.id}`);
            console.log(`   Name: ${role.name}`);
            console.log(`   Code: ${role.code}`);

            const rolePerms = role.permissions as any;
            const roleEnabledModules = Object.keys(rolePerms || {}).filter(k => rolePerms[k]?.enabled);

            console.log(`   Role Enabled Modules: ${roleEnabledModules.length}`);
            if (roleEnabledModules.length > 0) {
                console.log(`   List: ${roleEnabledModules.join(', ')}`);
            } else {
                console.log('   ⚠️  Role exists but has NO enabled modules! (This is likely the root cause)');
            }

            // Check for mismatch
            if (JSON.stringify(userPerms) !== JSON.stringify(rolePerms)) {
                console.log('\n⚠️  MISMATCH DELTA: User permissions do NOT match Role permissions!');
            } else {
                console.log('\n✅ User permissions match Role permissions exactly.');
            }

        } else {
            console.error('\n❌ User has userRoleId but Role record not found!');
        }
    } else {
        console.log('\n⚠️  User has NO userRoleId assigned (Link is broken)');
    }

    // 4. Check for "Counter Cashier" role existence generally
    const roles = await prisma.role.findMany({
        where: {
            tenantId: user.tenantId,
            name: { contains: 'cashier', mode: 'insensitive' }
        }
    });

    console.log('\n📋 AVAILABLE CASHIER ROLES IN TENANT:');
    roles.forEach(r => {
        const p = r.permissions as any;
        const count = Object.keys(p || {}).filter(k => p[k]?.enabled).length;
        console.log(`   - "${r.name}" (ID: ${r.id}) -> ${count} modules enabled`);
    });

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
