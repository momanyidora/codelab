import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TokenBucketRateLimiter } from "../../../src/rate-limiter/tokenBucket.js";

describe("TokenBucketRateLimiter", () => {
  let limiter: TokenBucketRateLimiter;
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  beforeEach(() => {
    // Create a limiter with 10 tokens/sec and capacity of 10
    limiter = new TokenBucketRateLimiter(10, 10);
  });

  it("should allow requests up to capacity", () => {
    const clientId = "test-client";

    // First 10 requests should be allowed (capacity is 10)
    for (let i = 0; i < 10; i++) {
      const result = limiter.allowRequest(clientId);
      expect(result.allowed).toBe(true);
    }

    // 11th request should be denied
    const result = limiter.allowRequest(clientId);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should refill tokens over time", async () => {
    const clientId = "test-client";

    // Use all tokens (capacity is 10)
    for (let i = 0; i < 10; i++) {
      limiter.allowRequest(clientId);
    }

    // Next request should be denied
    let result = limiter.allowRequest(clientId);
    expect(result.allowed).toBe(false);

   vi.advanceTimersByTime(150);
    // Now should have 1 token available
    result = limiter.allowRequest(clientId);
    expect(result.allowed).toBe(true);
  });

  it("should have separate buckets per client", () => {
    const client1 = "client1";
    const client2 = "client2";

    // Use all tokens for client1 (capacity is 10)
    for (let i = 0; i < 10; i++) {
      limiter.allowRequest(client1);
    }

    // client2 should still have full capacity
    const result = limiter.allowRequest(client2);
    expect(result.allowed).toBe(true);
  });

  it("should return retryAfter correctly", () => {
    const clientId = "test-client";

    // Use all tokens (capacity is 10)
    for (let i = 0; i < 10; i++) {
      limiter.allowRequest(clientId);
    }

    const result = limiter.allowRequest(clientId);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
    // At 10/sec, retryAfter should be 1 second
    expect(result.retryAfter).toBeLessThanOrEqual(2);
  });

  it("should get remaining tokens", () => {
    const clientId = "test-client";

    // Initially should have capacity (10)
    expect(limiter.getRemainingTokens(clientId)).toBe(10);

    // Use 8 tokens
    for (let i = 0; i < 8; i++) {
      limiter.allowRequest(clientId);
    }

    // Should have ~2 tokens remaining
    const remaining = limiter.getRemainingTokens(clientId);
    expect(remaining).toBeLessThanOrEqual(2);
    expect(remaining).toBeGreaterThanOrEqual(1);
  });

  it("should handle capacity of 1 correctly", () => {
    const smallLimiter = new TokenBucketRateLimiter(1, 1);
    const clientId = "test-client";

    // First request should be allowed
    expect(smallLimiter.allowRequest(clientId).allowed).toBe(true);

    // Second request should be denied
    expect(smallLimiter.allowRequest(clientId).allowed).toBe(false);
  });

  it("should handle high rate limits", () => {
    const highLimiter = new TokenBucketRateLimiter(100, 100);
    const clientId = "test-client";

    // Should allow 100 requests
    for (let i = 0; i < 100; i++) {
      expect(highLimiter.allowRequest(clientId).allowed).toBe(true);
    }

    // 101st should be denied
    expect(highLimiter.allowRequest(clientId).allowed).toBe(false);
  });
});
