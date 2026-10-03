import { prisma } from '@/lib/prisma';

const client = prisma as any;

/**
 * Scheduled job stub: Automates the expiration of quotes that have passed their validUntil date.
 * Frequency recommendation: Daily at midnight.
 */
export async function expireQuotesJob() {
    console.log('[CRON] Starting expireQuotesJob...');
    const now = new Date();

    try {
        const expiredQuotes = await client.salesQuote.updateMany({
            where: {
                status: { in: ['DRAFT', 'PENDING'] },
                validUntil: { lt: now }, // Passed the validity date
            },
            data: {
                status: 'EXPIRED',
            },
        });

        console.log(`[CRON] expireQuotesJob completed. Expired ${expiredQuotes.count} quotes.`);
        return { success: true, count: expiredQuotes.count };
    } catch (error) {
        console.error('[CRON] Error in expireQuotesJob:', error);
        return { success: false, error };
    }
}

/**
 * Scheduled job stub: Checks Opportunities against Stage SLAs and sends alerts.
 * Frequency recommendation: Hourly during business hours.
 */
export async function checkPipelineSLAAlertsJob() {
    console.log('[CRON] Starting checkPipelineSLAAlertsJob...');

    try {
        // 1. Fetch pipelines and their stage configurations (assuming SLA data is inside stage metadata)
        const pipelines = await client.crmPipeline.findMany({
            include: { stages: true },
        });

        let alertCount = 0;

        // 2. Iterate and evaluate SLA bounds
        for (const pipeline of pipelines) {
            for (const stage of pipeline.stages) {
                // Assume SLA max days is stored in metadata.maxDays
                const maxDays = (stage.metadata as any)?.maxDays;
                if (!maxDays) continue;

                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - maxDays);

                // Find opportunities stuck in this stage before the cutoff date
                const stuckOpps = await client.crmOpportunity.findMany({
                    where: {
                        pipelineId: pipeline.id,
                        stageId: stage.id,
                        status: 'OPEN',
                        updatedAt: { lt: cutoffDate }, // Last updated exceeds SLA threshold
                    },
                });

                if (stuckOpps.length > 0) {
                    // TODO: Dispatch real notifications (email, in-app bell) to Opp owner
                    console.log(`[CRON] Found ${stuckOpps.length} opportunities violating SLA in Stage: ${stage.name}`);
                    alertCount += stuckOpps.length;
                }
            }
        }

        console.log(`[CRON] checkPipelineSLAAlertsJob completed. Generated ${alertCount} alerts.`);
        return { success: true, alertsGenerated: alertCount };
    } catch (error) {
        console.error('[CRON] Error in checkPipelineSLAAlertsJob:', error);
        return { success: false, error };
    }
}
