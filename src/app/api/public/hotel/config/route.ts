import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/hotel/config?subdomain=...
 * 
 * Returns the HotelConfig for the given subdomain.
 * This is the FIRST API call the frontend makes to identify the tenant.
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
            }
        });

        if (!tenant) {
            return NextResponse.json(
                { error: 'Hotel not found' },
                { status: 404 }
            );
        }

        // 2. Find or create HotelConfig for this tenant
        let config = await prisma.hotelConfig.findUnique({
            where: { tenantId: tenant.id }
        });

        // If no config exists, create a default one
        if (!config) {
            config = await prisma.hotelConfig.create({
                data: {
                    tenantId: tenant.id,
                    hotelName: tenant.name,
                    logoUrl: tenant.logo ? `/api/settings/company/logo?subdomain=${tenant.subdomain}` : null,
                    primaryColor: tenant.primaryColor,
                }
            });
        }

        // 3. Return combined response
        return NextResponse.json({
            tenantId: tenant.id,
            subdomain: tenant.subdomain,
            config: {
                hotelName: config.hotelName,
                tagline: config.tagline,
                logoUrl: config.logoUrl || (tenant.logo ? `/api/settings/company/logo?subdomain=${tenant.subdomain}` : null),
                faviconUrl: config.faviconUrl,
                primaryColor: config.primaryColor || tenant.primaryColor,
                secondaryColor: config.secondaryColor,
                accentColor: config.accentColor,
                fontFamily: config.fontFamily,
                currency: (config as any).currency || 'LKR', // Currency for prices
                heroImageUrl: config.heroImageUrl,
                heroTitle: config.heroTitle,
                heroSubtitle: config.heroSubtitle,
                aboutUs: config.aboutUs,
                contactEmail: config.contactEmail,
                contactPhone: config.contactPhone,
                address: config.address,
                mapEmbedUrl: config.mapEmbedUrl,
                facebookUrl: config.facebookUrl,
                instagramUrl: config.instagramUrl,
                twitterUrl: config.twitterUrl,
                youtubeUrl: config.youtubeUrl,
                footerText: config.footerText,
                metaTitle: config.metaTitle,
                metaDescription: config.metaDescription,
                // Module Heroes
                diningHeroTitle: config.diningHeroTitle,
                diningHeroSubtitle: config.diningHeroSubtitle,
                diningHeroImage: config.diningHeroImage,
                experienceHeroTitle: config.experienceHeroTitle,
                experienceHeroSubtitle: config.experienceHeroSubtitle,
                experienceHeroImage: config.experienceHeroImage,
                eventHeroTitle: config.eventHeroTitle,
                eventHeroSubtitle: config.eventHeroSubtitle,
                eventHeroImage: config.eventHeroImage,
            }
        });

    } catch (error: any) {
        console.error('Error fetching hotel config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hotel configuration' },
            { status: 500 }
        );
    }
}
