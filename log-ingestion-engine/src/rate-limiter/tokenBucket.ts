// REQ-003: Reuse from Sprint 3
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export class TokenBucketRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private rate: number;
  private capacity: number;

  constructor(rate: number, capacity: number) {
    this.rate = rate;
    this.capacity = capacity;
  }

  private refill(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.rate;

    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  allowRequest(clientId: string): RateLimitResult {
    if (!this.buckets.has(clientId)) {
      this.buckets.set(clientId, {
        tokens: this.capacity,
        lastRefill: Date.now(),
      });
      return { allowed: true };
    }

    const bucket = this.buckets.get(clientId)!;
    this.refill(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }

    // Calculate retry-after (time until next token available in seconds)
    const retryAfter = Math.ceil((1 - bucket.tokens) / this.rate);
    return { allowed: false, retryAfter };
  }

  getRemainingTokens(clientId: string): number {
    const bucket = this.buckets.get(clientId);
    if (!bucket) return this.capacity;
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }
}
