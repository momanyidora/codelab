import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Boolean flags API", () => {
  it("should enable a flag through the API", async () => {
    const flagKey = `api-enable-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "API enable test flag",
      })
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    await request(app)
      .patch(`/flags/${flagKey}/rollout`)
      .set("X-Actor-Id", "dorah")
      .send({
        percentage: 100,
      })
      .expect(200);

    const response = await request(app)
      .get("/evaluate")
      .query({
        flag: flagKey,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.flag).toBe(flagKey);
    expect(response.body.user).toBe("dorah");
    expect(response.body.enabled).toBe(true);
    expect(response.body.reason).toBe("ROLLOUT_ENABLED");
  });

  it("should disable a flag through the API", async () => {
    const flagKey = `api-disable-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "API disable test flag",
      })
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    const response = await request(app)
      .patch(`/flags/${flagKey}`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: false,
      })
      .expect(200);

    expect(response.body.key).toBe(flagKey);
    expect(response.body.enabled).toBe(false);
  });

  it("should return FLAG_ENABLED when an enabled flag is evaluated", async () => {
    const flagKey = `api-evaluate-on-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "API evaluation enabled test flag",
      })
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    await request(app)
      .patch(`/flags/${flagKey}/rollout`)
      .set("X-Actor-Id", "dorah")
      .send({
        percentage: 100,
      })
      .expect(200);

    const response = await request(app)
      .get("/evaluate")
      .query({
        flag: flagKey,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.flag).toBe(flagKey);
    expect(response.body.user).toBe("dorah");
    expect(response.body.enabled).toBe(true);
    expect(response.body.reason).toBe("ROLLOUT_ENABLED");
  });

  it("should return FLAG_DISABLED when a disabled flag is evaluated", async () => {
    const flagKey = `api-evaluate-off-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "API evaluation disabled test flag",
      })
      .expect(201);

    const response = await request(app)
      .get("/evaluate")
      .query({
        flag: flagKey,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.flag).toBe(flagKey);
    expect(response.body.user).toBe("dorah");
    expect(response.body.enabled).toBe(false);
    expect(response.body.reason).toBe("FLAG_DISABLED");
  });

  it("should return false with FLAG_NOT_FOUND for a missing flag", async () => {
    const response = await request(app)
      .get("/evaluate")
      .query({
        flag: `does-not-exist-${Date.now()}`,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.enabled).toBe(false);
    expect(response.body.reason).toBe("FLAG_NOT_FOUND");
  });

  it("should reject a flag update when actor identity is missing", async () => {
    const flagKey = `api-missing-actor-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "API missing actor test flag",
      })
      .expect(201);

    const response = await request(app).patch(`/flags/${flagKey}`).send({
      enabled: true,
    });

    expect(response.status).toBe(400);
  });
});
