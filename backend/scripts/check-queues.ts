r/**
 * Check SQS Queue Status
 * 
 * Script to check the status of all SQS queues including:
 * - Approximate number of messages
 * - Messages not visible (being processed)
 * - Messages delayed
 */

import { sqsService, QueueType } from '../src/lib/sqs';
import { logger } from '../src/lib/logger';

const queues: QueueType[] = [
  'floorplan-analysis',
  'moodboard-generation',
  'interior-view-generation',
  'component-update',
  'notification',
];

async function checkQueues() {
  console.log('\n📊 Checking SQS Queue Status...\n');
  console.log('='.repeat(80));

  let totalMessages = 0;
  let totalProcessing = 0;
  let totalDelayed = 0;

  for (const queueType of queues) {
    try {
      const stats = await sqsService.getQueueStats(queueType);
      
      totalMessages += stats.approximateMessages;
      totalProcessing += stats.approximateMessagesNotVisible;
      totalDelayed += stats.approximateMessagesDelayed;

      const status = stats.approximateMessages > 0 ? '⚠️  HAS MESSAGES' : '✅ EMPTY';
      
      console.log(`\n${queueType.toUpperCase()}: ${status}`);
      console.log(`  📨 Available: ${stats.approximateMessages}`);
      console.log(`  ⚙️  Processing: ${stats.approximateMessagesNotVisible}`);
      console.log(`  ⏳ Delayed: ${stats.approximateMessagesDelayed}`);
      
      if (stats.approximateMessages > 0) {
        console.log(`  ⚠️  WARNING: ${stats.approximateMessages} message(s) waiting in queue!`);
      }
    } catch (error) {
      console.error(`\n❌ Error checking ${queueType}:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 SUMMARY:');
  console.log(`  Total messages waiting: ${totalMessages}`);
  console.log(`  Total messages processing: ${totalProcessing}`);
  console.log(`  Total messages delayed: ${totalDelayed}`);
  
  if (totalMessages > 0) {
    console.log(`\n⚠️  WARNING: ${totalMessages} message(s) are waiting in queues!`);
    console.log('   Consider checking worker logs or restarting workers.\n');
  } else {
    console.log('\n✅ All queues are empty!\n');
  }
}

// Run the check
checkQueues()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to check queues:', error);
    process.exit(1);
  });


