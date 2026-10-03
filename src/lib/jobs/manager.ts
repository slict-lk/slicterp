import { jobQueue } from '@/lib/jobs/queue';

// Background job manager for development and production
export class BackgroundJobManager {
  private static instance: BackgroundJobManager;
  private isRunning = false;

  static getInstance(): BackgroundJobManager {
    if (!BackgroundJobManager.instance) {
      BackgroundJobManager.instance = new BackgroundJobManager();
    }
    return BackgroundJobManager.instance;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Starting background job manager...');

    // Start the job queue
    jobQueue.start();

    // Set up graceful shutdown
    this.setupGracefulShutdown();

    console.log('✅ Background job manager started');
  }

  stop() {
    this.isRunning = false;
    jobQueue.stop();
    console.log('🛑 Background job manager stopped');
  }

  private setupGracefulShutdown() {
    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      this.stop();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught exception:', error);
      this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
      this.stop();
      process.exit(1);
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      queueStatus: jobQueue.getStatus(),
    };
  }

  // Manual trigger methods
  async triggerIntegrationSync(integrationId: string): Promise<boolean> {
    return await jobQueue.triggerSync(integrationId);
  }

  async triggerAllSyncs(): Promise<any> {
    // This would trigger sync for all active integrations
    // Implementation depends on specific requirements
    return { message: 'All syncs triggered (placeholder)' };
  }
}

// Export singleton instance
export const backgroundJobManager = BackgroundJobManager.getInstance();

// Auto-start in development
if (process.env.NODE_ENV === 'development' && process.env.JOB_QUEUE_ENABLED !== 'false') {
  // Start after a delay to ensure database is ready
  setTimeout(() => {
    backgroundJobManager.start();
  }, 5000);
}

// Auto-start in production
if (process.env.NODE_ENV === 'production' && process.env.JOB_QUEUE_ENABLED !== 'false') {
  backgroundJobManager.start();
}
