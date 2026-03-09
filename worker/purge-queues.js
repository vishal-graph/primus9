/**
 * Purge all SQS queues
 * Run with: node purge-queues.js
 */

require('dotenv').config();
const { SQSClient, PurgeQueueCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const queues = [
  {
    name: 'floorplan-analysis',
    url: process.env.SQS_QUEUE_FLOORPLAN_ANALYSIS,
  },
  {
    name: 'moodboard-generation',
    url: process.env.SQS_QUEUE_MOODBOARD_GENERATION,
  },
  {
    name: 'interior-view-generation',
    url: process.env.SQS_QUEUE_INTERIOR_VIEW_GENERATION,
  },
  {
    name: 'component-update',
    url: process.env.SQS_QUEUE_COMPONENT_UPDATE,
  },
  {
    name: 'notification',
    url: process.env.SQS_QUEUE_NOTIFICATION,
  },
  {
    name: 'pdf-export',
    url: process.env.SQS_QUEUE_PDF_EXPORT,
  },
];

async function purgeAllQueues() {
  console.log('🗑️  Purging all SQS queues...\n');

  for (const queue of queues) {
    if (!queue.url) {
      console.log(`⚠️  Skipping ${queue.name} (no URL configured)`);
      continue;
    }

    try {
      await client.send(new PurgeQueueCommand({ QueueUrl: queue.url }));
      console.log(`✅ Purged ${queue.name}`);
    } catch (error) {
      if (error.name === 'PurgeQueueInProgress') {
        console.log(`⏳ ${queue.name} - purge already in progress`);
      } else {
        console.error(`❌ Failed to purge ${queue.name}:`, error.message);
      }
    }
  }

  console.log('\n✨ Queue purge complete!');
  console.log('\nNote: AWS SQS purge can take up to 60 seconds to complete.');
}

purgeAllQueues().catch(console.error);
