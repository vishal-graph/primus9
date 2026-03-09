import { logger } from './logger';

/**
 * Graceful Shutdown Manager
 * 
 * Architecture Decision:
 * - Allows clean shutdown of workers
 * - Waits for in-flight jobs to complete
 * - Prevents new jobs from being picked up
 */

type ShutdownHandler = () => Promise<void>;

class ShutdownManager {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds

  constructor() {
    // Register signal handlers
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  /**
   * Register a shutdown handler
   */
  register(handler: ShutdownHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Check if shutdown is in progress
   */
  isInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Initiate shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info({ signal }, 'Received shutdown signal');

    // Set a timeout to force exit
    const forceExitTimer = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Execute all handlers in reverse order (LIFO)
      for (const handler of this.handlers.reverse()) {
        await handler();
      }

      clearTimeout(forceExitTimer);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  }
}

export const shutdownManager = new ShutdownManager();

