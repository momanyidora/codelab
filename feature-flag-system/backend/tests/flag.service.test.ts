import { describe, it, expect } from "vitest";
import {createFlagService, getAllFlagsService, getFlagByKeyService} from "../src/services/flag.service";
import { evaluateFlag } from "../src/services/evaluation.service";
import { createEnvironment, setEnvironmentEnabled, setEnvironmentRollout } from "../src/services/flag-environment.service";

describe("Flag Service", () => {

  const environment = "staging"

  it("should create a new flag", async () => {

    const key = `service-test-${Date.now()}`;
    const description = "A service layer test flag";

    const flag = await createFlagService(key, description);
  
    expect(flag.key).toBe(key);
    expect(flag.description).toBe(description);
  });

  it("should reject a duplicate flag key", async () => {
    const key = `duplicate-test-${Date.now()}`;
    const description = "Duplicate test flag";

    await createFlagService(key, description);

    await expect(createFlagService(key, description)).rejects.toThrow(
      `Flag with key "${key}" already exists`,
    );
  });

  it("should retrieve a flag by key", async () => {
    const key = `retrieve-test-${Date.now()}`;
    const description = "A retrieve test flag";

    await createFlagService(key, description);

    const flag = await getFlagByKeyService(key);

    expect(flag).not.toBeNull();
    expect(flag?.key).toBe(key);
    expect(flag?.description).toBe(description);
  });

  it("should return all flags", async () => {
    const key = `list-test-${Date.now()}`;
    const description = "A list test flag";

    await createFlagService(key, description);

    const flags = await getAllFlagsService();

    expect(flags.length).toBeGreaterThan(0);

    const createdFlag = flags.find((flag) => flag.key === key);

    expect(createdFlag).toBeDefined();
  });

  it("should create a new flag with enabled set to false", async () => {
    const key = `off-by-default-${Date.now()}`;
    const description = "A flag that should start off";
    const flag = await createFlagService(key, description);
    expect(flag.enabled).toBe(false);
  });

  it("should disable every user when rollout percentage is 0", async() => {
    const key = `rollout-zero-${Date.now()}`;

    await createFlagService(
      key,
      "0 percent rollout"
    )
    await createEnvironment(key, environment)
    await setEnvironmentEnabled(key, environment, true);

    await setEnvironmentRollout(key, environment, 0);

    const result = await evaluateFlag(key, "alice", environment);


    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("ROLLOUT_DISABLED");
  });
  it("should enable every user when rollout percentage is 100", async () => {
    const key = `rollout-full-${Date.now()}`;

    await createFlagService(
      key,
      "100 percent rollout"
     
    );
    await createEnvironment(key, environment)
    await setEnvironmentEnabled(key, environment, true);

    await setEnvironmentRollout(key, environment, 100);

    const users = ["alice", "bob", "charles", "dorah"];

    for (const user of users) {
      const result = await evaluateFlag(key, user, environment);

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("ROLLOUT_ENABLED");
    }
  });
  it("should ignore rollout percentage when flag is disabled", async () => {
    const key = `disabled-rollout-${Date.now()}`;
  
    await createFlagService(
      key,
      "Disabled rollout"
    );
  
    await createEnvironment(key, environment);
    await setEnvironmentRollout(key, environment, 100);
  
    const result = await evaluateFlag(key, "alice", environment);
  
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("FLAG_DISABLED");
  });

  it("should reject rollout percentage above 100", async() => {
    const key = `invalid-rollout-${Date.now()}`;

    await createFlagService(
      key, 
      "Invalid rollout"
  
    );
    await expect(
      setEnvironmentRollout(key, environment, 101)
    ).rejects.toThrow("Rollout percentage must be between 0 and 100.")
  })



  it("should reject rollout update for a missing flag", async () => {
    await expect(
      setEnvironmentRollout(
        "missing-flag",
        environment,
        50
      )
    ).rejects.toThrow('Flag with key "missing-flag" was not found.');
  });
});
