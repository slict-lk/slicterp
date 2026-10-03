import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    sendTrialExpiringEmail,
    sendTrialUrgentEmail,
    sendTrialExpiredEmail,
} from '@/lib/email';
import { isCronBearerAuthorized } from '@/lib/cron-bearer-auth';

/**
 * Cron endpoint for trial notification emails
 *
 * Queries all trial tenants and sends appropriate emails based on days remaining.
 * Tracks sent notifications in Tenant.settings.emailsSent to prevent duplicates.
 *
 * Schedule: daily via Vercel Cron or external scheduler
 * Security: CRON_SECRET header required
 */
export async function GET(req: NextRequest) {
    if (!isCronBearerAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch all trial tenants with their admin users
        const trialTenants = await prisma.tenant.findMany({
            where: { plan: 'trial', trialEnd: { not: null } },
            include: {
                users: {
                    where: { role: 'ADMIN', isActive: true },
                    select: { email: true, name: true },
                    take: 1, // Primary admin only
                },
            },
        });

        const results = {
            processed: 0,
            emailsSent: 0,
            skipped: 0,
            errors: 0,
        };

        for (const tenant of trialTenants) {
            results.processed++;

            const admin = tenant.users[0];
            if (!admin?.email) {
                results.skipped++;
                continue;
            }

            const trialEnd = tenant.trialEnd!;
            const now = new Date();
            const diffMs = trialEnd.getTime() - now.getTime();
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            // Track sent emails to prevent duplicates
            const settings = (tenant.settings as Record<string, any>) || {};
            const emailsSent = settings.emailsSent || {};

            let emailKey: string | null = null;
            let sendFn: (() => Promise<void>) | null = null;

            if (daysLeft <= 0 && !emailsSent['expired']) {
                emailKey = 'expired';
                sendFn = () =>
                    sendTrialExpiredEmail(admin.email, {
                        name: admin.name || 'there',
                        companyName: tenant.companyName || tenant.name,
                    });
            } else if (daysLeft === 1 && !emailsSent['1day']) {
                emailKey = '1day';
                sendFn = () =>
                    sendTrialUrgentEmail(admin.email, {
                        name: admin.name || 'there',
                        companyName: tenant.companyName || tenant.name,
                        trialEnd,
                    });
            } else if (daysLeft <= 3 && daysLeft > 1 && !emailsSent['3day']) {
                emailKey = '3day';
                sendFn = () =>
                    sendTrialExpiringEmail(admin.email, {
                        name: admin.name || 'there',
                        companyName: tenant.companyName || tenant.name,
                        trialEnd,
                        daysLeft,
                    });
            }

            if (emailKey && sendFn) {
                try {
                    await sendFn();
                    // Mark as sent
                    await prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            settings: {
                                ...settings,
                                emailsSent: { ...emailsSent, [emailKey]: new Date().toISOString() },
                            },
                        },
                    });
                    results.emailsSent++;
                } catch (err) {
                    console.error(`Failed to send ${emailKey} email to ${admin.email}:`, err);
                    results.errors++;
                }
            } else {
                results.skipped++;
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results,
        });
    } catch (error) {
        console.error('Cron trial notifications error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
