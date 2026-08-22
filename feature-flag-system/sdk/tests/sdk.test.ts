import { describe, expect, it, vi } from "vitest";
import { FeatureFlagSDK } from "../src/index.js";

describe("FeatureFlagSDK", () => {
  it("should return the service decision", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          enabled: true,
        }),
      }),
    );

    const sdk = new FeatureFlagSDK({
      baseUrl: "http://localhost:3000",
      environment: "staging",
    });

    const result = await sdk.isEnabled("new-dashboard", "dorah");

    expect(result).toBe(true);
  });

  it("should return false when the service is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Service unavailable")),
    );

    const sdk = new FeatureFlagSDK({
      baseUrl: "http://localhost:3000",
      environment: "staging",
    });

    const result = await sdk.isEnabled("new-dashboard", "dorah");

    expect(result).toBe(false);
  });

  it("should use the caller's fallback when the service is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Service unavailable")),
    );

    const sdk = new FeatureFlagSDK({
      baseUrl: "http://localhost:3000",
      environment: "production",
      fallback: true,
    });

    const result = await sdk.isEnabled("new-dashboard", "dorah");

    expect(result).toBe(true);
  });

  it("should return the fallback when the flag does not exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          enabled: false,
          reason: "FLAG_NOT_FOUND",
        }),
      }),
    );

    const sdk = new FeatureFlagSDK({
      baseUrl: "http://localhost:3000",
      environment: "staging",
      fallback: true,
    });

    const result = await sdk.isEnabled("missing-flag", "dorah");

    expect(result).toBe(false);
  });

  it("should send the configured environment to the service", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        enabled: true,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const sdk = new FeatureFlagSDK({
      baseUrl: "http://localhost:3000",
      environment: "production",
    });

    await sdk.isEnabled("new-dashboard", "dorah");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchParams: expect.anything(),
      }),
    );

    const calledUrl = fetchMock.mock.calls[0][0] as URL;

    expect(calledUrl.searchParams.get("flag")).toBe("new-dashboard");
    expect(calledUrl.searchParams.get("user")).toBe("dorah");
    expect(calledUrl.searchParams.get("environment")).toBe("production");
  });
});
