require('dotenv').config();

// Test the tenant creation API endpoint
async function testTenantCreation() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    console.log('🧪 Testing Tenant Creation API...\n');
    console.log('Endpoint: POST /api/tenants');
    console.log('Base URL:', baseUrl);

    const testTenantData = {
        name: 'Test Tenant',
        companyName: 'Test Company',
        subdomain: 'test-tenant-' + Date.now(),
        adminEmail: 'test-admin@example.com',
        adminPassword: 'TestPassword123!',
        adminName: 'Test Admin',
        plan: 'STARTER',
        // Note: NOT sending 'modules' array to test default behavior
    };

    console.log('\n📋 Test Data (no modules specified):');
    console.log(JSON.stringify(testTenantData, null, 2));

    try {
        const response = await fetch(`${baseUrl}/api/tenants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testTenantData),
        });

        const result = await response.json();

        console.log('\n📊 Response Status:', response.status);
        console.log('📊 Response Data:');
        console.log(JSON.stringify(result, null, 2));

        if (response.ok && result.user) {
            console.log('\n✅ Tenant created successfully!');
            console.log('\n🔍 Checking module permissions for created user:');
            
            const permissions = result.user.modulePermissions;
            const hotelPermission = permissions?.hotel;
            
            console.log('Hotel Module Permission:');
            console.log('  Enabled:', hotelPermission?.enabled);
            console.log('  View:', hotelPermission?.view);
            
            if (hotelPermission?.enabled === false) {
                console.log('\n✅ SUCCESS: Hotel module is DISABLED by default (as expected)');
            } else {
                console.log('\n❌ FAILURE: Hotel module is ENABLED (should be disabled by default)');
            }
            
            // Check core modules
            console.log('\n🔍 Core Modules Status:');
            const coreModules = ['dashboard', 'settings', 'users'];
            coreModules.forEach(moduleId => {
                const perm = permissions?.[moduleId];
                console.log(`  ${moduleId}: enabled=${perm?.enabled}, view=${perm?.view}`);
            });
        } else {
            console.log('\n❌ Failed to create tenant');
            console.log('Error:', result);
        }

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
    }
}

testTenantCreation();
