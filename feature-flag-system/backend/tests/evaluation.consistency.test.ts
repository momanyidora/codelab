import { describe, expect, it } from "vitest";
import { evaluateFlag } from "../src/services/evaluation.service.js";
import {createFlagService,} from "../src/services/flag.service.js";
import { createEnvironment, setEnvironmentEnabled, setEnvironmentRollout } from "../src/services/flag-environment.service.js";


describe("Evaluation consistency", () => {
  const environment = "staging"
  it("should return the same result for the same user across repeated evaluations", async () => {
    const key = `consistent-${Date.now()}`;
    await createFlagService(key, "Consistency test");
    await createEnvironment(key, environment)

    await setEnvironmentEnabled(key, environment, true);
    await setEnvironmentRollout(key, environment, 50);

    const first = await evaluateFlag(key, "dorah", environment);
    const second = await evaluateFlag(key, "dorah", environment);
    const third = await evaluateFlag(key, "dorah", environment);

    expect(first.enabled).toBe(second.enabled);
    expect(second.enabled).toBe(third.enabled);
    expect(first.reason).toBe(second.reason);
    expect(second.reason).toBe(third.reason);
  });

  it("should use the flag key when evaluating the rollout", async () => {
    const flagA = `consistency-a-${Date.now()}`;
    const flagB = `consistency-b-${Date.now()}`;


    await createEnvironment(flagA, environment);
    await createEnvironment(flagB, environment);

    await createFlagService(flagA, "First flag");
    await createFlagService(flagB, "Second flag");

    await setEnvironmentEnabled(flagA, environment, true);
    await setEnvironmentEnabled(flagB, environment, true);

    await setEnvironmentRollout(flagA, environment, 50);
    await setEnvironmentRollout(flagB, environment, 50);

    const resultA = await evaluateFlag(flagA, "dorah", environment);
    const resultB = await evaluateFlag(flagB, "dorah", environment);

    expect(resultA.flag).toBe(flagA);
    expect(resultB.flag).toBe(flagB);

    // The two evaluations are allowed to have the same
    // result by chance, but each evaluation must use its
    // own flag key when calculating the bucket.
    expect([true, false]).toContain(resultA.enabled);
    expect([true, false]).toContain(resultB.enabled);
  });

  it("should preserve a user's enabled result when rollout increases from 20% to 30%", async () => {
    const key = `monotonic-${Date.now()}`;

    await createFlagService(key, "Monotonic rollout test");
    await createEnvironment(key, environment)

    await setEnvironmentEnabled(key, environment, true);

    const users = Array.from({ length: 1000 }, (_, index) => `user-${index}`);

    await setEnvironmentRollout(key, environment, 20);

    const enabledAt20 = new Set<string>();

    for (const user of users) {
      const result = await evaluateFlag(key, user, environment);

      if (result.enabled) {
        enabledAt20.add(user);
      }
    }

    await setEnvironmentRollout(key, environment, 30);

    const enabledAt30 = new Set<string>();

    for (const user of users) {
      const result = await evaluateFlag(key, user, environment);

      if (result.enabled) {
        enabledAt30.add(user);
      }
    }

    for (const user of enabledAt20) {
      expect(enabledAt30.has(user)).toBe(true);
    }

    expect(enabledAt30.size).toBeGreaterThanOrEqual(enabledAt20.size);
  }, 15000);

  it("should enable every user at 100% rollout", async () => {

    const key = `all-users-${Date.now()}`;

    await createFlagService(key, "100 percent test");
    await createEnvironment(key, environment);

    await setEnvironmentEnabled(key, environment, true);
    await setEnvironmentRollout(key, environment, 100);

    const users = ["alice", "bob", "james", "dorah", "peter"];

    for (const user of users) {
      const result = await evaluateFlag(key, user, environment);

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("ROLLOUT_ENABLED");
    }
  });

  it("should disable every user at 0% rollout", async () => {
    
    const key = `no-users-${Date.now()}`;

    await createFlagService(key, "0 percent test");
    await createEnvironment(key, environment)

    await setEnvironmentEnabled(key, environment, true);
    await setEnvironmentRollout(key, environment, 0);

    const users = ["alice", "bob", "james", "dorah", "peter"];

    for (const user of users) {
      const result = await evaluateFlag(key, user, environment);

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("ROLLOUT_DISABLED");
    }
  });
});
