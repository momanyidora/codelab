import crypto from "node:crypto";

export function getBucket(user: string, flagKey: string): number {
  const input = `${flagKey}:${user}`;

  const hash = crypto.createHash("sha256").update(input).digest("hex");

  const value = parseInt(hash.substring(0, 8), 16);

  return value % 100;
}
