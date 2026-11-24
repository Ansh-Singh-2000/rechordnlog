import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!(await verifySessionToken(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN is not configured." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folderRaw = formData.get("folder");
    const folder = folderRaw === "selfies" ? "selfies" : "moments";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    // Enforce reasonable max size (5MB) even after client compression
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 5MB limit." },
        { status: 413 }
      );
    }

    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const datePrefix = new Date().toISOString().slice(0, 10);
    const uniqueSuffix = crypto.randomUUID().slice(0, 8);
    const pathname = `${folder}/${datePrefix}-${uniqueSuffix}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || "image/webp",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload image to storage." },
      { status: 500 }
    );
  }
}
