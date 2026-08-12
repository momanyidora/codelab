import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../src/app"


describe("Percentage rollout API", () => {
    it("should update the rollout percentage", async() => {
        const key = `rollout-api-${Date.now()}`;

        await request(app).post("/flags").set("X-Actor-Id", "dorah").send({
            key,
            description: "Rollout API test",
        }).expect(201)

        const response = await request(app)
        .patch(`/flags/${key}`).set("X-Actor-Id", "dorah")
        .send({enabled: true})
        .expect(200);
  
      expect(response.body.enabled).toBe(true);
  
      const rolloutResponse = await request(app)
        .patch(`/flags/${key}/rollout`)
        .set("X-Actor-Id", "dorah")
        .send({
          percentage: 30,
        })
        .expect(200);
  
      expect(rolloutResponse.body.rolloutPercentage).toBe(30);
    });


    it("should reject invalid rollout percentages", async () => {
      const key = `rollout-invalid-${Date.now()}`;

      await request(app)
        .post("/flags")
        .set("X-Actor-Id", "dorah")
        .send({
          key,
          description: "Invalid rollout",
        })
        .expect(201);

      const response = await request(app)
        .patch(`/flags/${key}/rollout`)
        .set("X-Actor-Id", "dorah")
        .send({
          percentage: 150,
        })
        .expect(400);

      expect(response.body.error.code).toBe("INVALID_ROLLOUT_PERCENTAGE");
    });

    it("should require actor identity", async () => {
      const key = `rollout-actor-${Date.now()}`;

      await request(app)
        .post("/flags")
        .set("X-Actor-Id", "dorah")
        .send({
          key,
          description: "Actor test",
        })
        .expect(201);

      const response = await request(app)
        .patch(`/flags/${key}/rollout`)
        .send({
          percentage: 20,
        })
        .expect(400);

      expect(response.body.error.code).toBe("MISSING_ACTOR");
    });

    it("should return 404 for missing flags", async () => {
      const response = await request(app)
        .patch("/flags/does-not-exist/rollout")
        .set("X-Actor-Id", "dorah")
        .send({
          percentage: 20,
        })
        .expect(404);

      expect(response.body.error.code).toBe("FLAG_NOT_FOUND");
    });

    
    })