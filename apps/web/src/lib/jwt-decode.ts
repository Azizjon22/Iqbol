export function decodeJwtExp(token: string): number | null {
  try {
    const [, payloadB64] = token.split(".");
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

export function isJwtExpiringSoon(token: string, thresholdSeconds = 120): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  const nowSeconds = Date.now() / 1000;
  return exp - nowSeconds < thresholdSeconds;
}
