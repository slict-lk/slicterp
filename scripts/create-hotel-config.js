const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const tenantId = 'cmj5ktzxk0001eapifavwmi6z'; // SLICTHOTEL

    const config = await p.hotelConfig.create({
        data: {
            tenantId: tenantId,
            hotelName: 'SLICT Hotel',
            tagline: 'Your Comfort, Our Priority',
            primaryColor: '#1a365d',
            secondaryColor: '#2b6cb0',
            accentColor: '#ed8936',
            heroTitle: 'Welcome to SLICT Hotel',
            heroSubtitle: 'Experience luxury and comfort',
            contactEmail: 'info@slicthotel.com',
            contactPhone: '+94 11 234 5678',
            address: 'Colombo, Sri Lanka',
            metaTitle: 'SLICT Hotel - Luxury Accommodation',
            metaDescription: 'Book your stay at SLICT Hotel',
        }
    });

    console.log('✅ HotelConfig created for SLICT Hotel!');
    console.log('   Hotel Name:', config.hotelName);
}

main()
    .catch(e => console.error('Error:', e.message))
    .finally(() => p.$disconnect());
