import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("User targeting API", () => {
  it("should add a user to a flag's targeting list", async () => {
    const flagKey = `target-add-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Target add test",
      })
      .expect(201);

    const response = await request(app)
      .post(`/flags/${flagKey}/targeting/dorah`)
      .set("X-Actor-Id", "dorah")
      .expect(201);

    expect(response.body.flag).toBe(flagKey);
    expect(response.body.userId).toBe("dorah");
  });

  it("should list targeted users", async () => {
    const flagKey = `target-list-${Date.now()}`;
    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Target list test",
      })
      .expect(201);

    await request(app)
      .post(`/flags/${flagKey}/targeting/alice`)
      .set("X-Actor-Id", "dorah")
      .expect(201);

    const response = await request(app)
      .get(`/flags/${flagKey}/targeting`)
      .expect(200);

    expect(response.body.flag).toBe(flagKey);
    expect(response.body.users).toContain("alice");
  });

  it("should remove a user from targeting", async () => {
    const flagKey = `target-remove-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Target remove test",
      })
      .expect(201);

    await request(app)
      .post(`/flags/${flagKey}/targeting/bob`)
      .set("X-Actor-Id", "dorah")
      .expect(201);

    await request(app)
      .delete(`/flags/${flagKey}/targeting/bob`)
      .set("X-Actor-Id", "dorah")
      .expect(204);

    const response = await request(app)
      .get(`/flags/${flagKey}/targeting`)
      .expect(200);

    expect(response.body.users).not.toContain("bob");
  });

  it("should reject targeting changes without actor identity", async () => {
    const flagKey = `target-no-actor-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "No actor test",
      })
      .expect(201);

    const response = await request(app)
      .post(`/flags/${flagKey}/targeting/dorah`)
      .expect(400);

    expect(response.body.error.code).toBe("ACTOR_ID_REQUIRED");
  });

  it("should update evaluations immediately after targeting changes", async () => {
    const flagKey = `target-eval-${Date.now()}`;

    await request(app)
      .post("/flags")
      .set("X-Actor-Id", "dorah")
      .send({
        key: flagKey,
        description: "Evaluation test",
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
      .post(`/flags/${flagKey}/targeting/dorah`)
      .set("X-Actor-Id", "dorah")
      .expect(201);

    let response = await request(app)
      .get("/evaluate")
      .query({
        flag: flagKey,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.enabled).toBe(true);

    await request(app)
      .delete(`/flags/${flagKey}/targeting/dorah`)
      .set("X-Actor-Id", "dorah")
      .expect(204);

    response = await request(app)
      .get("/evaluate")
      .query({
        flag: flagKey,
        user: "dorah",
      })
      .expect(200);

    expect(response.body.flag).toBe(flagKey);
  });
});
