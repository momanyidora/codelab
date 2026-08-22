import { FeatureFlagSDK } from "./src/index.js";

async function main() {
  const sdk = new FeatureFlagSDK({
    baseUrl: "http://localhost:9999",
    environment: "production",
    fallback: false,
  });

  const result = await sdk.isEnabled("api-test-flag", "dorah");

  console.log("Feature enabled:", result);
}

main();
