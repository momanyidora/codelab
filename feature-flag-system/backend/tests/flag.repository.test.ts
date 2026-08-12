import { describe, expect, it } from "vitest";
import {
  createFlag,
  findFlagByKey,
} from "../src/repositories/flag.repository.js";

describe("Flag Repository", () => {
  it("should create and retrieve a flag from PostgreSQL", async () => {
    const key = `test-flag-${Date.now()}`;
    const description = "A test feature flag";

    const createdFlag = await createFlag(key, description);

    expect(createdFlag).toBeDefined();
    expect(createdFlag.key).toBe(key);
    expect(createdFlag.description).toBe(description);

    const foundFlag = await findFlagByKey(key);

    expect(foundFlag).toBeDefined();
    expect(foundFlag?.key).toBe(key);
    expect(foundFlag?.description).toBe(description);
  });
});
