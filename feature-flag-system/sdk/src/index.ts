export type Fallback = boolean;

export interface FeatureFlagSDKOptions {
  baseUrl: string;
  environment: string;
  fallback?: Fallback;
}

export class FeatureFlagSDK {
  private readonly baseUrl: string;
  private readonly environment: string;
  private readonly fallback: boolean;

  constructor(options: FeatureFlagSDKOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.environment = options.environment;
    this.fallback = options.fallback ?? false;
  }

  async isEnabled(flagKey: string, userId: string): Promise<boolean> {
    try {
      const url = new URL(`${this.baseUrl}/evaluate`);

      url.searchParams.set("flag", flagKey);
      url.searchParams.set("user", userId);
      url.searchParams.set("environment", this.environment);

      const response = await fetch(url);

      if (!response.ok) {
        return this.fallback;
      }

      const data = await response.json();

      if (typeof data.enabled !== "boolean") {
        return this.fallback;
      }

      return data.enabled;
    } catch {
      return this.fallback;
    }
  }
}
