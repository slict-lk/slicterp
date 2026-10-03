import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/spareparts/config?subdomain=...
 * Returns the SparePartsConfig for the given subdomain.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subdomain = searchParams.get('subdomain');

        if (!subdomain) {
            return NextResponse.json(
                { error: 'Subdomain is required' },
                { status: 400 }
            );
        }

        // 1. Find Tenant by subdomain
        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: {
                id: true,
                subdomain: true,
                name: true,
                logo: true,
                primaryColor: true,
                companyName: true,
                settings: true,
            }
        });

        if (!tenant) {
            return NextResponse.json(
                { error: 'Store not found' },
                { status: 404 }
            );
        }

        // 2. Find or create SparePartsConfig for this tenant
        // Use 'any' cast if Typescript client isn't fully updated in IDE but DB has schema
        let config = await prisma.sparePartsConfig.findUnique({
            where: { tenantId: tenant.id }
        });

        // Auto-provision if missing
        if (!config) {
            // Default demo data
            config = await prisma.sparePartsConfig.create({
                data: {
                    tenantId: tenant.id,
                    storeName: tenant.name || 'Auto Parts Store',
                    logoUrl: tenant.logo ? `/api/settings/company/logo?subdomain=${tenant.subdomain}` : null,
                    primaryColor: tenant.primaryColor || '#C8102E',
                    secondaryColor: '#1E3A5F',
                    currency: 'LKR',
                    heroSlides: [
                        {
                            id: '1',
                            imageUrl: '',
                            title: 'Top Quality Aftermarket Parts',
                            subtitle: 'Turbochargers & Engine Components',
                            buttonText: 'Shop Now',
                            buttonLink: '/products'
                        }
                    ],
                    benefits: [
                        { icon: 'Truck', title: 'Island-wide Delivery', description: 'Within 24 hours' },
                        { icon: 'Shield', title: 'Quality Guarantee', description: 'Original & Aftermarket' }
                    ],
                    services: [
                        { icon: 'Search', title: 'Parts Consultation', description: 'Not sure which part fits your vehicle? Our experts use official catalogs to verify compatibility using your chassis number, ensuring 100% fitment accuracy.', linkText: 'FREE SERVICE', linkUrl: '#' },
                        { icon: 'Car', title: 'Special Orders', description: 'Looking for a rare JDM part or a specific European component? We can special order directly from manufacturers in Japan, Thailand, and Europe.', linkText: 'REQUEST QUOTE', linkUrl: '#' },
                        { icon: 'Wrench', title: 'Installation Support', description: 'We partner with a network of trusted garages. Purchase parts from us and get recommended to certified mechanics for professional installation.', linkText: 'ASK US', linkUrl: '#' },
                        { icon: 'PenTool', title: 'Wholesale Supply', description: 'Running a garage or fleet? We offer special B2B pricing and bulk supply agreements for continuous business partners.', linkText: 'JOIN PROGRAM', linkUrl: '#' },
                    ],
                    aboutUs: {
                        story: "Welcome to our store, where passion for automobiles meets exceptional service. We established this business with a clear mission: to provide vehicle owners and enthusiasts with the highest quality spare parts and accessories available in the market.",
                        mission: "To be the most trusted automotive parts provider, delivering quality, expertise, and reliability to every customer.",
                        stats: [
                            { label: 'Happy Customers', value: '10k+', icon: 'Users' },
                            { label: 'Quality Guarantee', value: '100%', icon: 'Award' },
                            { label: 'Island-wide Delivery', value: 'Fast', icon: 'Truck' },
                            { label: 'Expert Support', value: '24/7', icon: 'HeadphonesIcon' }
                        ],
                        values: [
                            { title: "Quality You Can Trust", desc: "We refuse to compromise on quality. Every product in our catalog is verified for authenticity and performance standards." },
                            { title: "Fair Pricing", desc: "Premium parts shouldn't cost a fortune. We work directly with distributors to offer you the most competitive prices in the market." },
                            { title: "Technical Expertise", desc: "Our team isn't just salespeople; we are automotive enthusiasts and experts who understand exactly what your vehicle needs." }
                        ]
                    }
                }
            });
        }

        // 3. Merge Tenant Settings (JSON) into the Config object for runtime flexibility
        // This ensures if we add "aboutUs" to the Tenant.settings in DB, it overrides or augments the static config
        const mergedConfig = {
            ...config,
            // Core Contact & Social from Tenant Settings (overrides Config)
            contactEmail: (tenant.settings as any)?.contactEmail || (config as any).contactEmail,
            contactPhone: (tenant.settings as any)?.contactPhone || (config as any).contactPhone,
            address: (tenant.settings as any)?.address || (config as any).address,
            whatsappNumber: (tenant.settings as any)?.whatsappNumber || (config as any).whatsappNumber,
            facebookUrl: (tenant.settings as any)?.facebookUrl || (config as any).facebookUrl,
            instagramUrl: (tenant.settings as any)?.instagramUrl || (config as any).instagramUrl,
            linkedinUrl: (tenant.settings as any)?.linkedinUrl || (config as any).linkedinUrl,

            // Extended Content
            aboutUs: (tenant.settings as any)?.aboutUs || (config as any).aboutUs,
            services: (tenant.settings as any)?.services || (config as any).services,
            businessHours: (tenant.settings as any)?.businessHours || (config as any).businessHours,
            mapUrl: (tenant.settings as any)?.mapUrl || (config as any).mapUrl,
            promoBanners: (config as any).promoBanners || (tenant.settings as any)?.promoBanners || (tenant.settings as any)?.banners || [],
        };

        console.log('[DEBUG-CONFIG] Tenant ID:', tenant.id);
        console.log('[DEBUG-CONFIG] Config promoBanners (raw):', JSON.stringify((config as any).promoBanners));
        console.log('[DEBUG-CONFIG] Settings promoBanners (raw):', JSON.stringify((tenant.settings as any)?.promoBanners));
        console.log('[DEBUG-CONFIG] Merged Config promoBanners length:', (mergedConfig.promoBanners as any[])?.length);
        console.log('[DEBUG-CONFIG] Merged Config Contact:', {
            email: mergedConfig.contactEmail,
            phone: mergedConfig.contactPhone,
            addr: mergedConfig.address
        });


        return NextResponse.json({
            tenantId: tenant!.id,
            subdomain: tenant!.subdomain,
            config: mergedConfig
        });



    } catch (error: any) {
        console.error('Error fetching spare parts config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch store configuration' },
            { status: 500 }
        );
    }
}
