import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Flag history", () => {
  it("records flag creation", async () => {
    const flagKey = `history-create-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "History creation test",
      })
      .expect(201);

    const response = await request(app)
      .get(`/flags/${flagKey}/history`)
      .expect(200);

    expect(response.body).toHaveLength(1);

    expect(response.body[0].flag).toBe(flagKey);
    expect(response.body[0].actor).toBe("dorah");
    expect(response.body[0].action).toBe("FLAG_CREATED");
    expect(response.body[0].before).toBeNull();
    expect(response.body[0].after).toMatchObject({
      key: flagKey,
      enabled: false,
      description: "History creation test",
      rolloutPercentage: 0,
    });
  });

  it("records enabled changes", async () => {
    const flagKey = `history-enabled-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Enabled history test",
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
      .get(`/flags/${flagKey}/history`)
      .expect(200);

    const enabledHistory = response.body.find(
      (entry: { action: string }) => entry.action === "FLAG_ENABLED_CHANGED",
    );

    expect(enabledHistory).toBeDefined();
    expect(enabledHistory.actor).toBe("dorah");
    expect(enabledHistory.before).toBe(false);
    expect(enabledHistory.after).toBe(true);
  });

  it("records rollout changes", async () => {
    const flagKey = `history-rollout-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Rollout history test",
      })
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}/rollout`)
      .set("X-Actor-Id", "dorah")
      .send({
        percentage: 20,
      })
      .expect(200);

    await request(app)
      .patch(`/flags/${flagKey}/rollout`)
      .set("X-Actor-Id", "dorah")
      .send({
        percentage: 30,
      })
      .expect(200);

    const response = await request(app)
      .get(`/flags/${flagKey}/history`)
      .expect(200);

    const rolloutHistory = response.body.filter(
      (entry: { action: string }) =>
        entry.action === "ROLLOUT_PERCENTAGE_CHANGED",
    );

    expect(rolloutHistory).toHaveLength(2);

    expect(rolloutHistory[0].before).toBe(0);
    expect(rolloutHistory[0].after).toBe(20);

    expect(rolloutHistory[1].before).toBe(20);
    expect(rolloutHistory[1].after).toBe(30);
  });
  it("records environment changes", async () => {
    const flagKey = `history-environment-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Environment history test",
      })
      .expect(201);

    await request(app)
      .post(`/flags/${flagKey}/environments/staging`)
      .set("X-Actor-Id", "dorah")
      .expect(201);

    await request(app)
      .patch(`/flags/${flagKey}/environments/staging`)
      .set("X-Actor-Id", "dorah")
      .send({
        enabled: true,
      })
      .expect(200);

    const response = await request(app)
      .get(`/flags/${flagKey}/history`)
      .expect(200);

    const environmentHistory = response.body.find(
      (entry: { action: string; environment: string | null }) =>
        entry.action === "ENVIRONMENT_ENABLED_CHANGED" &&
        entry.environment === "staging",
    );

    expect(environmentHistory).toBeDefined();
    expect(environmentHistory.actor).toBe("dorah");
    expect(environmentHistory.before).toBe(false);
    expect(environmentHistory.after).toBe(true);
  });

  it("returns history chronologically", async () => {
    const flagKey = `history-order-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Chronological history test",
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
        percentage: 50,
      })
      .expect(200);

    const response = await request(app)
      .get(`/flags/${flagKey}/history`)
      .expect(200);

    expect(response.body.length).toBe(3);

    expect(response.body[0].action).toBe("FLAG_CREATED");
    expect(response.body[1].action).toBe("FLAG_ENABLED_CHANGED");
    expect(response.body[2].action).toBe("ROLLOUT_PERCENTAGE_CHANGED");

    const timestamps = response.body.map((entry: { createdAt: string }) =>
      new Date(entry.createdAt).getTime(),
    );

    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it("records KILL_SWITCH_ENGAGED", async () => {
    const flagKey = `history-kill-engaged-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch history test",
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

    const history = response.body.find(
      (entry: { action: string }) => entry.action === "KILL_SWITCH_ENGAGED",
    );

    expect(history).toBeDefined();
    expect(history.actor).toBe("dorah");
    expect(history.before).toBe(false);
    expect(history.after).toBe(true);
  });

  it("records KILL_SWITCH_RELEASED", async () => {
    const flagKey = `history-kill-released-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Kill switch release history test",
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

    const history = response.body.find(
      (entry: { action: string }) => entry.action === "KILL_SWITCH_RELEASED",
    );

    expect(history).toBeDefined();
    expect(history.actor).toBe("dorah");
    expect(history.before).toBe(true);
    expect(history.after).toBe(false);
  });
});
