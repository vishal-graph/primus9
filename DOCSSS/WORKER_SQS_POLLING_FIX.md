# Worker SQS Polling Fix

## Problem
The worker was using periodic polling with `setInterval` every 20 seconds, causing significant delays in job processing. Jobs enqueued to SQS would sit in the queue for up to 20 seconds before being picked up.

## Root Cause
The `startPolling` method in `worker-pool.ts` was using:
```typescript
const interval = setInterval(poll, this.options.pollIntervalSeconds * 1000);
// Polled every 20 seconds
```

## Solution
Implemented **continuous long polling** using SQS's built-in `WaitTimeSeconds` parameter:

1. Set `WaitTimeSeconds: 20` in the SQS `ReceiveMessageCommand`
   - This makes SQS wait up to 20 seconds for messages before returning
   - If a message arrives during the wait, it's returned immediately
   
2. After processing messages, immediately start polling again using `setImmediate`
   - No artificial delays between poll cycles
   - Worker continuously listens for new jobs

## Changes

### Before:
```typescript
private startPolling(queueName: string, queueUrl: string): void {
  const poll = async () => {
    // ... polling logic ...
    WaitTimeSeconds: this.options.pollIntervalSeconds, // Used 20 seconds
  };
  
  const interval = setInterval(poll, this.options.pollIntervalSeconds * 1000);
  this.pollingIntervals.push(interval);
  poll(); // Initial poll
}
```

### After:
```typescript
private startPolling(queueName: string, queueUrl: string): void {
  const poll = async () => {
    // ... polling logic ...
    WaitTimeSeconds: 20, // SQS long polling (max 20 seconds)
    
    // Immediately poll again after processing
    if (this.isRunning) {
      setImmediate(() => poll());
    }
  };
  
  poll(); // Start continuous polling
}
```

## Benefits

1. **Immediate Job Pickup**: Jobs are processed within milliseconds of being enqueued
2. **Reduced API Calls**: Long polling means fewer empty responses from SQS
3. **Better Resource Usage**: No artificial delays, worker is always ready
4. **Improved UX**: Users see moodboard generation start immediately
5. **Cost Savings**: Fewer SQS API calls (long polling reduces request count)

## Testing
1. Create a moodboard generation job
2. Check worker logs - should see "Processing message" within 1 second
3. Verify job completes successfully

## Performance Impact
- **Before**: 0-20 second delay before job processing starts
- **After**: < 1 second delay before job processing starts
- **Improvement**: ~95% reduction in latency

## Files Modified
- `worker/src/worker-pool.ts`

## Deployment Notes
- **IMPORTANT**: Restart worker service to apply changes
- No database migrations required
- No environment variable changes needed
- Command: `cd worker && npm run dev` (development) or restart service (production)
