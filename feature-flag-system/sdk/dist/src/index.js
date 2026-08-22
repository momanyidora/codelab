"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagSDK = void 0;
class FeatureFlagSDK {
    baseUrl;
    environment;
    fallback;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        this.environment = options.environment;
        this.fallback = options.fallback ?? false;
    }
    async isEnabled(flagKey, userId) {
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
        }
        catch {
            return this.fallback;
        }
    }
}
exports.FeatureFlagSDK = FeatureFlagSDK;
