export interface WalkthroughJobInput {
  projectId: string;
  roomId: string;
  userId: string;
  jobId: string;
  version?: number;
}

export interface WalkthroughResult {
  videoData: Buffer;
  mimeType: string;
  durationSeconds: number;
  resolution: string;
  generationTimeMs: number;
}
