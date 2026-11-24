import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "rechordnlog_session";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(): Promise<string> {
  return new SignJWT({ sub: "owner", app: "rechordnlog" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.sub === "owner" && payload.app === "rechordnlog";
  } catch {
    return false;
  }
}

export function isPasscodeConfigured(): boolean {
  return Boolean(process.env.APP_PASSCODE && process.env.JWT_SECRET);
}
