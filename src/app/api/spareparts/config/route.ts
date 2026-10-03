import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
    try {
        // Initialize session to get correct tenant
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get tenantId from session
        const tenantId = session.user.tenantId;

        if (!tenantId) {
            return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (tenant) {
            console.log('[DEBUG-INTERNAL-API] Found Tenant via Session:', tenant.id, tenant.name, tenant.subdomain);
        } else {
            console.log('[DEBUG-INTERNAL-API] Tenant not found for ID:', tenantId);
        }

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Query SparePartsConfig separately to avoid type issues
        let config = await prisma.sparePartsConfig.findUnique({
            where: { tenantId: tenant.id }
        });

        // Auto-provision if missing
        if (!config) {
            config = await prisma.sparePartsConfig.create({
                data: {
                    tenantId: tenant.id,
                    storeName: tenant.name || 'Auto Parts Store',
                    logoUrl: tenant.logo ? '/api/settings/company/logo' : '',
                    primaryColor: tenant.primaryColor || '#C8102E',
                    secondaryColor: '#1E3A5F',
                    heroSlides: [],
                }
            });
        }

        // Merge Tenant Settings
        const s = (tenant.settings as any) || {};

        const mergedConfig = {
            ...config,
            // Map settings to flat response
            contactEmail: s.contactEmail || config.contactEmail,
            contactPhone: s.contactPhone || config.contactPhone,
            address: s.address || config.address,
            facebookUrl: s.facebookUrl || config.facebookUrl,
            instagramUrl: s.instagramUrl || config.instagramUrl,

            // New fields from settings (fallback) or config
            // Legacy Support: Check for 'banners' in settings if promoBanners is empty
            promoBanners: (config as any).promoBanners || (tenant.settings as any)?.promoBanners || (tenant.settings as any)?.banners || [],
        };

        console.log('[DEBUG-CONFIG] Tenant ID:', tenant.id);
        console.log('[DEBUG-CONFIG] Config promoBanners (raw):', JSON.stringify((config as any).promoBanners));
        console.log('[DEBUG-CONFIG] Settings promoBanners (raw):', JSON.stringify((tenant.settings as any)?.promoBanners));
        console.log('[DEBUG-CONFIG] Settings banners (legacy):', JSON.stringify((tenant.settings as any)?.banners));
        console.log('[DEBUG-CONFIG] Merged Config promoBanners length:', (mergedConfig.promoBanners as any[])?.length);

        return NextResponse.json(mergedConfig);
    } catch (error) {
        console.error("Config fetch error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, tenantId, ...data } = body;

        // Legacy Support: Remap 'banners' to 'promoBanners'
        if (data.banners && !data.promoBanners) {
            console.log('[DEBUG-API] Remapping legacy banners to promoBanners');
            data.promoBanners = data.banners;
            delete data.banners;
        }

        if (!id) {
            return NextResponse.json({ error: 'Config ID required' }, { status: 400 });
        }

        // Separate fields for SparePartsConfig vs Tenant.settings
        const configFields = ['storeName', 'tagline', 'primaryColor', 'secondaryColor', 'logoUrl', 'heroSlides', 'promoBanners', 'featuredCategories', 'currency', 'taxRate', 'aboutUs', 'services'];

        const configData: any = {};
        const settingsData: any = {};

        Object.keys(data).forEach(key => {
            if (configFields.includes(key)) {
                configData[key] = data[key];
            } else {
                settingsData[key] = data[key];
            }
        });

        // 1. Update SparePartsConfig
        const updatedConfig = await prisma.sparePartsConfig.update({
            where: { id },
            data: configData
        });

        // 2. Update Tenant Settings
        // We need to fetch current settings first to merge deeply if needed, or just merge top level
        const tenant = await prisma.tenant.findUnique({ where: { id: updatedConfig.tenantId } });
        if (tenant) {
            const currentSettings = (tenant.settings as any) || {};

            // Construct new settings object
            // Map flat API fields back to structured settings JSON
            const newSettings = {
                ...currentSettings,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                address: data.address,
                facebookUrl: data.facebookUrl,
                instagramUrl: data.instagramUrl,
                linkedinUrl: data.linkedinUrl,
                whatsappNumber: data.whatsappNumber,
                mapUrl: data.mapUrl,

                aboutUs: data.aboutUs || currentSettings.aboutUs,
                businessHours: data.businessHours || currentSettings.businessHours,
            };

            await prisma.tenant.update({
                where: { id: tenant.id },
                data: {
                    name: data.storeName, // Sync store name to tenant name
                    primaryColor: data.primaryColor, // Sync core branding
                    logo: data.logoUrl,
                    settings: newSettings
                }
            });
        }

        return NextResponse.json(updatedConfig);
    } catch (error) {
        console.error("Config update error:", error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}
