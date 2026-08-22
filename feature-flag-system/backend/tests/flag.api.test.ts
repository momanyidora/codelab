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
  it("should default kill switch to false", async () => {
    const flagKey = `kill-default-${Date.now()}`;

    const response = await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch default test",
      })
      .expect(201);

    expect(response.body.killSwitch).toBe(false);
  });

  it("should engage the kill switch", async () => {
    const flagKey = `kill-engage-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch engage test",
      })
      .expect(201);

    const response = await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    expect(response.body.killSwitch).toBe(true);
  });

  it("should return KILL_SWITCH when evaluating a killed flag", async () => {
    const flagKey = `kill-evaluate-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch evaluation test",
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

    await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    const response = await request(app)
      .get("/evaluate")
      .query({
        flag: flagKey,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.enabled).toBe(false);
    expect(response.body.reason).toBe("KILL_SWITCH");
  });

  it("should release the kill switch", async () => {
    const flagKey = `kill-release-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch release test",
      })
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    const response = await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: false,
      })
      .expect(200);

    expect(response.body.killSwitch).toBe(false);
  });

  it("should return normal evaluation behavior after kill switch is released", async () => {
    const flagKey = `kill-normal-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch normal behavior test",
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

    await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: false,
      })
      .expect(200);

    const response = await request(app)
      .get("/evaluate")
      .query({
        flag: flagKey,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.enabled).toBe(true);
    expect(response.body.reason).toBe("ROLLOUT_ENABLED");
  });

  it("should record kill switch engagement in history", async () => {
    const flagKey = `kill-history-engage-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch history engage test",
      })
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    const response = await request(app)
      .get(`/flags/${flagKey}/history`)
      .expect(200);

    const killSwitchHistory = response.body.find(
      (entry: { action: string }) => entry.action === "KILL_SWITCH_ENGAGED",
    );

    expect(killSwitchHistory).toBeDefined();
    expect(killSwitchHistory.before).toBe(false);
    expect(killSwitchHistory.after).toBe(true);
    expect(killSwitchHistory.actor).toBe("dorah");
  });

  it("should record kill switch release in history", async () => {
    const flagKey = `kill-history-release-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch history release test",
      })
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: false,
      })
      .expect(200);

    const response = await request(app)
      .get(`/flags/${flagKey}/history`)
      .expect(200);

    const killSwitchHistory = response.body.find(
      (entry: { action: string }) => entry.action === "KILL_SWITCH_RELEASED",
    );

    expect(killSwitchHistory).toBeDefined();
    expect(killSwitchHistory.before).toBe(true);
    expect(killSwitchHistory.after).toBe(false);
    expect(killSwitchHistory.actor).toBe("dorah");
  });

  it("should reject kill switch update when actor identity is missing", async () => {
    const flagKey = `kill-missing-actor-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch missing actor test",
      })
      .expect(201);

    const response = await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .send({
        enabled: true,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("ACTOR_ID_REQUIRED");
  });

  it("should reject an invalid kill switch enabled value", async () => {
    const flagKey = `kill-invalid-value-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch invalid value test",
      })
      .expect(201);

    const response = await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: "true",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_KILL_SWITCH_VALUE");
  });

  it("should return 404 when kill switch flag does not exist", async () => {
    const flagKey = `missing-kill-flag-${Date.now()}`;

    const response = await request(app)
      .patch(`/flags/${flagKey}/kill-switch`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("FLAG_NOT_FOUND");
  });
});
