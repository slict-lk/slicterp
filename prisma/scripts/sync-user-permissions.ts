/**
 * Sync User Permissions from Roles
 * 
 * This script updates all users' modulePermissions based on their assigned roles.
 * Run this when users have been assigned roles but their permissions aren't showing.
 * 
 * Usage: npx tsx prisma/scripts/sync-user-permissions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting user permissions sync...\n');

    // Get all users who have a roleId assigned
    const users = await prisma.user.findMany({
        where: {
            userRoleId: {
                not: null
            }
        },
        include: {
            userRole: true
        }
    });

    console.log(`📋 Found ${users.length} users with roles assigned\n`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
        try {
            if (!user.userRole) {
                console.log(`⚠️  Skipping ${user.name} (${user.email}) - Role not found`);
                skipped++;
                continue;
            }

            const role = user.userRole;
            const rolePermissions = role.permissions as any;

            // Check if user already has these permissions
            const currentPermissions = user.modulePermissions as any;
            const permissionsMatch = JSON.stringify(rolePermissions) === JSON.stringify(currentPermissions);

            if (permissionsMatch) {
                console.log(`✓ ${user.name} - Already synced`);
                skipped++;
                continue;
            }

            // Update user with role's permissions
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    modulePermissions: rolePermissions,
                    role: role.code as any // Also ensure legacy role code matches
                }
            });

            console.log(`✅ ${user.name} (${user.email}) - Synced from role "${role.name}"`);
            console.log(`   Permissions: ${Object.keys(rolePermissions || {}).filter(k => rolePermissions[k]?.enabled).length} modules enabled`);
            synced++;
        } catch (error) {
            console.error(`❌ ${user.name} - Error:`, error);
            errors++;
        }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Synced: ${synced}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✨ Done! Users need to log out and log back in to see changes.');
}

main()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
