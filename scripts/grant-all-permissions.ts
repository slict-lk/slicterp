const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MODULE_IDS = [
    'dashboard', 'sales', 'contacts', 'accounting', 'inventory',
    'automotive', 'vehicle-export', 'spareparts', 'manufacturing',
    'quality', 'purchasing', 'hr', 'helpdesk', 'livechat',
    'knowledge', 'forum', 'projects', 'calendar', 'marketing',
    'blog', 'courses', 'surveys', 'cart', 'pos', 'subscriptions',
    'integrations', 'ai', 'studio', 'automation', 'healthcare',
    'properties', 'restaurant', 'hotel', 'settings', 'users', 'audit'
];

async function updatePermissions() {
    const email = 'demo@slict.lk';

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`User ${email} not found!`);
            return;
        }

        console.log('Found user:', user.name);
        console.log('Current permissions:', JSON.stringify(user.modulePermissions, null, 2));

        const newPermissions = {};

        // Enable all modules with full access
        MODULE_IDS.forEach(id => {
            newPermissions[id] = {
                enabled: true,
                view: true,
                create: true,
                edit: true,
                delete: true,
                export: true,
                import: true,
                approve: true
            };
        });

        // Update User permissions
        await prisma.user.update({
            where: { id: user.id },
            data: {
                modulePermissions: newPermissions
            }
        });

        // Also need to ensure Tenant has these modules enabled in enabledModules array?
        // Sidebar checks user permissions, but sometimes logic checks Tenant.enabledModules?
        // Let's update Tenant too just in case authentication logic involves checking tenant modules.
        // In auth-options.ts, it was just user permissions, but let's be safe.
        await prisma.tenant.update({
            where: { id: user.tenantId },
            data: {
                enabledModules: MODULE_IDS
            }
        });

        console.log('Successfully updated permissions for user and tenant!');
        console.log('Added modules:', MODULE_IDS.join(', '));

    } catch (error) {
        console.error('Error updating permissions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePermissions();
