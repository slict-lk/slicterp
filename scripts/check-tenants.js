const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    // Check if ceylon-paradise exists
    const ceylon = await prisma.tenant.findUnique({
        where: { subdomain: 'ceylon-paradise' }
    });

    if (!ceylon) {
        console.log('Creating test tenant "ceylon-paradise"...');

        const newTenant = await prisma.tenant.create({
            data: {
                name: 'Ceylon Paradise Resort',
                companyName: 'Ceylon Paradise Resort (Pvt) Ltd',
                subdomain: 'ceylon-paradise',
                status: 'ACTIVE',
                plan: 'professional',
                primaryColor: '#0F4C81',
                logo: 'https://via.placeholder.com/150x50?text=Ceylon+Paradise'
            }
        });
        console.log('Created tenant:', newTenant.id);

        // Create HotelConfig
        const config = await prisma.hotelConfig.create({
            data: {
                tenantId: newTenant.id,
                hotelName: 'Ceylon Paradise Resort',
                tagline: 'Experience Luxury & Serenity',
                primaryColor: '#0F4C81',
                secondaryColor: '#202124',
                heroTitle: 'Welcome to Ceylon Paradise',
                heroSubtitle: 'Your beachfront escape in Sri Lanka',
                contactEmail: 'reservations@ceylonparadise.com',
                contactPhone: '+94 11 234 5678',
                address: '123 Paradise Road, Galle, Sri Lanka'
            }
        });
        console.log('Created HotelConfig:', config.id);
    } else {
        console.log('Tenant "ceylon-paradise" already exists:', ceylon.id);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
