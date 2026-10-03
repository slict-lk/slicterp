import prisma from '../prisma';

const client = prisma as any;
import { IntegrationLogger } from '@/lib/integrations/base';
import { processAllTenantAutomationQueues } from '@/lib/ai/control-plane';

// Job queue manager
export class JobQueue {
  private static instance: JobQueue;
  private jobs: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Starting job queue...');

    // Start all scheduled jobs
    this.scheduleIntegrationSync();
    this.scheduleCleanupJobs();
    this.scheduleAIControlPlane();

    console.log('✅ Job queue started');
  }

  stop() {
    this.isRunning = false;
    this.jobs.forEach(timeout => clearTimeout(timeout));
    this.jobs.clear();
    console.log('🛑 Job queue stopped');
  }

  private scheduleIntegrationSync() {
    // Sync integrations every 15 minutes
    const syncInterval = 15 * 60 * 1000; // 15 minutes

    const syncJob = setInterval(async () => {
      await this.syncAllIntegrations();
    }, syncInterval);

    this.jobs.set('integration_sync', syncJob);

    // Also run initial sync after 30 seconds
    setTimeout(async () => {
      await this.syncAllIntegrations();
    }, 30000);
  }

  private async syncAllIntegrations() {
    try {
      console.log('🔄 Starting integration sync...');

      const integrations = await client.integrationAccount.findMany({
        where: {
          isActive: true,
        },
      });

      for (const integration of integrations) {
        try {
          await this.syncSingleIntegration(integration);
        } catch (error) {
          console.error(`Failed to sync integration ${integration.id}:`, error);

          await IntegrationLogger.log(
            'system',
            integration.id,
            'scheduled_sync',
            'ERROR',
            `Scheduled sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      console.log(`✅ Integration sync completed for ${integrations.length} integrations`);
    } catch (error) {
      console.error('Integration sync failed:', error);
    }
  }

  private async syncSingleIntegration(integration: any) {
    try {
      let syncResult: any;

      switch (integration.platform) {
        case 'FACEBOOK_MARKETPLACE':
          const { FacebookMarketplaceService } = await import('@/lib/integrations/facebookService');
          const fbService = new FacebookMarketplaceService('system', integration);
          syncResult = await fbService.syncData();
          break;

        case 'WHATSAPP_BUSINESS':
          const { WhatsAppBusinessService } = await import('@/lib/integrations/whatsappService');
          const waService = new WhatsAppBusinessService('system', integration);
          syncResult = await waService.syncData();
          break;

        case 'ARAMEX':
        case 'DHL':
        case 'DOMEX':
          const { CourierService } = await import('@/lib/integrations/courierService');
          const courierService = new CourierService('system', integration);
          syncResult = await courierService.syncData();
          break;

        case 'IKMAN_LK':
          const { IkmanService } = await import('@/lib/integrations/ikmanService');
          const ikmanService = new IkmanService('system', integration);
          syncResult = await ikmanService.syncData();
          break;

        default:
          console.log(`No sync handler for platform: ${integration.platform}`);
          return;
      }

      await IntegrationLogger.log(
        'system',
        integration.id,
        'scheduled_sync',
        'SUCCESS',
        `Scheduled sync completed: ${JSON.stringify(syncResult)}`,
        syncResult,
        undefined,
        undefined,
        undefined,
        1
      );

      // Update last sync time
      await client.integrationAccount.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });

    } catch (error) {
      await IntegrationLogger.log(
        'system',
        integration.id,
        'scheduled_sync',
        'ERROR',
        error instanceof Error ? error.message : 'Scheduled sync failed'
      );

      throw error;
    }
  }

  private scheduleCleanupJobs() {
    // Clean up old logs daily
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

    const cleanupJob = setInterval(async () => {
      await this.cleanupOldLogs();
    }, cleanupInterval);

    this.jobs.set('cleanup_logs', cleanupJob);

    // Clean up immediately if needed
    setTimeout(async () => {
      await this.cleanupOldLogs();
    }, 60000); // After 1 minute
  }

  private scheduleAIControlPlane() {
    const intervalMs = 60 * 1000;

    const controlPlaneJob = setInterval(async () => {
      await this.processAIControlPlane();
    }, intervalMs);

    this.jobs.set('ai_control_plane', controlPlaneJob);

    setTimeout(async () => {
      await this.processAIControlPlane();
    }, 15000);
  }

  private async processAIControlPlane() {
    try {
      const result = await processAllTenantAutomationQueues();
      console.log(
        `🤖 AI control plane processed queues for ${result.tenants} tenants (${result.processed} runs, ${result.escalations} escalations)`
      );
    } catch (error) {
      console.error('AI control plane queue processing failed:', error);
    }
  }

  private async cleanupOldLogs() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await prisma.integrationLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          status: {
            in: ['SUCCESS', 'PENDING'] as any,
          },
        },
      });

      console.log(`🧹 Cleaned up ${result.count} old integration logs`);

      await IntegrationLogger.log(
        'system',
        'system',
        'cleanup_logs',
        'SUCCESS',
        `Cleaned up ${result.count} old logs`,
        { deletedCount: result.count }
      );

    } catch (error) {
      console.error('Failed to cleanup logs:', error);

      await IntegrationLogger.log(
        'system',
        'system',
        'cleanup_logs',
        'ERROR',
        error instanceof Error ? error.message : 'Cleanup failed'
      );
    }
  }

  // Manual trigger for specific integration sync
  async triggerSync(integrationId: string): Promise<boolean> {
    try {
      const integration = await client.integrationAccount.findUnique({
        where: { id: integrationId },
      });

      if (!integration || !integration.isActive) {
        return false;
      }

      await this.syncSingleIntegration(integration);
      return true;
    } catch (error) {
      console.error(`Failed to trigger sync for integration ${integrationId}:`, error);
      return false;
    }
  }

  // Get queue status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.size,
      jobTypes: Array.from(this.jobs.keys()),
    };
  }
}

// Export singleton instance
export const jobQueue = JobQueue.getInstance();

// Auto-start job queue in development
if (process.env.NODE_ENV === 'development') {
  // Start after a delay to ensure database is ready
  setTimeout(() => {
    jobQueue.start();
  }, 10000);
}
