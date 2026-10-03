import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const settings: any = tenant.settings || {};

        return NextResponse.json({
            dailyMemo: settings.restaurantDailyMemo || [
                { id: '1', text: 'Main Oven inspection at 3:00 PM today.' },
                { id: '2', text: 'Special of the week: Jaffna Prawn Curry.' }
            ],
            shiftRules: settings.restaurantShiftRules || [
                { id: '1', text: 'Clock in at least 10 minutes before shift.' },
                { id: '2', text: 'Sanitize stations every 2 hours.' }
            ]
        });
    } catch (error) {
        console.error('Error fetching restaurant config:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const body = await request.json();

        const currentSettings = (tenant.settings as any) || {};

        const updatedSettings = {
            ...currentSettings,
            restaurantDailyMemo: body.dailyMemo ?? currentSettings.restaurantDailyMemo,
            restaurantShiftRules: body.shiftRules ?? currentSettings.restaurantShiftRules,
        };

        const updatedTenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: { settings: updatedSettings as any }
        });

        return NextResponse.json({
            dailyMemo: (updatedTenant.settings as any)?.restaurantDailyMemo,
            shiftRules: (updatedTenant.settings as any)?.restaurantShiftRules
        });
    } catch (error) {
        console.error('Error updating restaurant config:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
