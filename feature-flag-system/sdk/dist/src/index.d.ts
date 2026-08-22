export type Fallback = boolean;
export interface FeatureFlagSDKOptions {
    baseUrl: string;
    environment: string;
    fallback?: Fallback;
}
export declare class FeatureFlagSDK {
    private readonly baseUrl;
    private readonly environment;
    private readonly fallback;
    constructor(options: FeatureFlagSDKOptions);
    isEnabled(flagKey: string, userId: string): Promise<boolean>;
}
