import { describe, expect, it } from "vitest";
import { getBucket } from "../src/utils/hash.js";

describe("Consistent percentage hashing", () => {
  const environment = "staging";
  it("should return the same bucket for the same user and flag", () => {
    const first = getBucket("dorah", "new-dashboard");
    const second = getBucket("dorah", "new-dashboard");

    expect(first).toBe(second);
  });

  it("should produce different buckets for different flags", () => {
    const first = getBucket("dorah", "new-dashboard");
    const second = getBucket("dorah", "checkout-redesign");

    expect(first).not.toBe(second);
  });

  it("should always return a bucket between 0 and 99", () => {
    const users = [
      "dorah",
      "alice",
      "bob",
      "james",
      "peter",
      "user-1000",
      "user-2000",
    ];

    for(let i = 0; i < users.length; i++) {
        const user = users[i];
      const bucket = getBucket(user, "new-dashboard");

      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it("should preserve users when increasing rollout from 20% to 30%", () => {
    const users = Array.from(
      { length: 1000 },
      (_, index) => `user-${index}`,
    );

    const at20 = new Set<number>();
    const at30 = new Set<number>();

    users.forEach((user, index) => {
      const bucket = getBucket(user, "new-dashboard");

      if (bucket < 20) {
        at20.add(index);
      }

      if (bucket < 30) {
        at30.add(index);
      }
    });

    for (const userIndex of at20) {
      expect(at30.has(userIndex)).toBe(true);
    }
    expect(at30.size).toBeGreaterThanOrEqual(at20.size);
  });

  it("should select approximately 20% of a large population", () => {
    const users = Array.from(
      { length: 10000 },
      (_, index) => `user-${index}`,
    );

    let enabled = 0;

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
      const bucket = getBucket(user, "new-dashboard");

      if (bucket < 20) {
        enabled++;
      }
    }

    const percentage = (enabled / users.length) * 100;

    expect(percentage).toBeGreaterThan(15);
    expect(percentage).toBeLessThan(25);
  });

  it("should select nobody at 0%", () => {
    const users = Array.from(
      { length: 1000 },
      (_, index) => `user-${index}`,
    );

    const enabled = users.filter(
      (user) => getBucket(user, "new-dashboard") < 0,
    );

    expect(enabled).toHaveLength(0);
  });

  it("should select everyone at 100%", () => {
    const users = Array.from(
      { length: 1000 },
      (_, index) => `user-${index}`,
    );

    const enabled = users.filter(
      (user) => getBucket(user, "new-dashboard") < 100,
    );

    expect(enabled).toHaveLength(users.length);
  });
});
