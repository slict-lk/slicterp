
import { PrismaClient } from '@prisma/client';
import { SystemRoles } from '../src/lib/rbac';

const prisma = new PrismaClient();

// Helper to convert legacy JSON permissions to string array
function convertLegacyPermissions(permissions: any): string[] {
    if (Array.isArray(permissions)) {
        // Already array, assume strings
        return permissions as string[];
    }

    if (typeof permissions === 'object' && permissions !== null) {
        const newPermissions: string[] = [];

        Object.entries(permissions).forEach(([moduleId, config]: [string, any]) => {
            if (config?.enabled) {
                if (config.view) newPermissions.push(`${moduleId}:view`);
                if (config.create) newPermissions.push(`${moduleId}:create`);
                if (config.edit) newPermissions.push(`${moduleId}:edit`);
                if (config.delete) newPermissions.push(`${moduleId}:delete`);
                if (config.export) newPermissions.push(`${moduleId}:export`);
                if (config.import) newPermissions.push(`${moduleId}:import`);
                if (config.approve) newPermissions.push(`${moduleId}:approve`);
            }
        });

        return newPermissions;
    }

    return [];
}

async function main() {
    console.log('🚀 Starting Safe Role Migration...');

    // 1. Get all tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
        console.log(`\nProcessing Tenant: ${tenant.name} (${tenant.subdomain})`);

        // 2. Sync System Roles (Admin, Manager, etc.)
        // We want to UPDATE them to match the new definitions in SystemRoles
        for (const [key, template] of Object.entries(SystemRoles)) {
            const roleCode = key; // e.g. "ADMIN"

            // Check if exists
            const existingRole = await prisma.role.findFirst({
                where: { tenantId: tenant.id, code: roleCode }
            });

            if (existingRole) {
                console.log(`  ~ Updating system role: ${template.name}`);
                await prisma.role.update({
                    where: { id: existingRole.id },
                    data: {
                        description: template.description,
                        permissions: template.permissions as any,
                        // isSystem field does not exist in schema, so we skip it
                    }
                });
            } else {
                console.log(`  + Creating default role: ${template.name}`);
                try {
                    await prisma.role.create({
                        data: {
                            name: template.name,
                            code: roleCode,
                            description: template.description,
                            permissions: template.permissions as any,
                            tenantId: tenant.id
                        }
                    });
                } catch (err) {
                    console.error(`FAILED to create role ${template.name}:`, err);
                }
            }
        }

        // 3. Migrate Custom Roles
        // Filter by excluding system role codes
        const systemRoleCodes = Object.keys(SystemRoles);
        const customRoles = await prisma.role.findMany({
            where: {
                tenantId: tenant.id,
                code: { notIn: systemRoleCodes }
            }
        });

        for (const role of customRoles) {
            console.log(`  ~ Migrating custom role: ${role.name}`);

            const currentPerms = role.permissions;
            // Check if it looks like legacy JSON (object not array)
            if (currentPerms && typeof currentPerms === 'object' && !Array.isArray(currentPerms)) {
                const newPerms = convertLegacyPermissions(currentPerms);
                console.log(`    > Converted ${Object.keys(currentPerms).length} modules to ${newPerms.length} strings`);

                await prisma.role.update({
                    where: { id: role.id },
                    data: {
                        permissions: newPerms as any
                    }
                });
            } else {
                console.log(`    > Already in correct format or empty.`);
            }
        }

        // 4. Link Users to Roles (Legacy fix)
        const users = await prisma.user.findMany({
            where: { tenantId: tenant.id }
        });

        for (const user of users) {
            if (user.role && !user.userRoleId) {
                // Try to find a matching role by code
                const role = await prisma.role.findFirst({
                    where: { tenantId: tenant.id, code: user.role }
                });

                if (role) {
                    console.log(`    > Linking user ${user.email} to ${role.name}`);
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { userRoleId: role.id }
                    });
                }
            }
        }
    }

    console.log('\n✅ Migration Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
