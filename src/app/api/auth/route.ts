import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  AUTH_COOKIE_NAME,
  COOKIE_MAX_AGE_SECONDS,
  isPasscodeConfigured,
  signSessionToken,
} from "@/lib/auth";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  try {
    if (!isPasscodeConfigured()) {
      return NextResponse.json(
        { error: "Server auth is not configured (APP_PASSCODE / JWT_SECRET missing)." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { passcode?: string };
    const passcode = typeof body.passcode === "string" ? body.passcode : "";

    if (!passcode || !safeCompare(passcode, process.env.APP_PASSCODE!)) {
      return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
    }

    const token = await signSessionToken();
    const response = NextResponse.json({ ok: true });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
