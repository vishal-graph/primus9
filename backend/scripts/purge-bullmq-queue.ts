/**
 * Purge all jobs and keys for the BullMQ `ai-jobs` queue (waiting, active, delayed, completed, failed).
 *
 * Stop `npm run queue:worker` first so no job is processed mid-purge.
 *
 * Usage: npm run queue:purge -- --yes
 */

import { aiJobQueue, closeQueues } from '../src/workers/queue';

async function main() {
  if (!process.argv.includes('--yes')) {
    console.error('Refusing to run without --yes (destructive).');
    console.error('  Stop the queue worker, then: npm run queue:purge -- --yes');
    process.exit(1);
  }

  console.log('Obliterating BullMQ queue "ai-jobs" (force=true)...');
  await aiJobQueue.obliterate({ force: true });
  console.log('Done. Queue is empty.');
  await closeQueues();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
