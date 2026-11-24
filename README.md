# `rechordnlog`

A fast, tactile, mobile-first personal visual journal and daily selfie log built with Next.js (App Router), Neon Postgres, Drizzle ORM, and Vercel Blob.

## Features

- **Sub-5-Second Daily Selfie:** Front-camera WebRTC capture with mirrored live preview, framing guide, 1-tap mood tags (`Calm`, `Energized`, `Focused`, `Tired`, `Grateful`, `Chaos`), automatic `streakDay` tracking, and native camera fallback.
- **Moment / Event Logger:** Rear camera or gallery upload with automatic metadata extraction, optional original photo timestamp toggle, captions, and `#tags`.
- **Client-Side Image Compression:** Uses `browser-image-compression` before uploading to resize photos to max `1600px` and encode as `WebP` (`0.80` quality, `~200–350KB` target, with JPEG fallback), maximizing Vercel Blob free-tier storage.
- **Selfie Flipbook / Timelapse Player:** Scrub through your daily selfies or play them back at `2fps`, `4fps`, or `8fps`.
- **Zero Vendor Lock-In Export Hub:** 1-click export to canonical JSON (`rechordnlog-export-v1.json`), CSV, or a portable `.zip` bundle (`JSON` + `CSV` + `INTEGRATION_GUIDE.md`), plus an in-app Developer / Integration preview tab.
- **Private Passcode Gate:** Protected by `APP_PASSCODE` and an `HttpOnly` signed JWT cookie (`jose`).
- **PWA Ready:** Includes `public/manifest.json` and mobile viewport configuration for "Add to Home Screen".

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS + `lucide-react`
- **Database:** Neon Postgres + Drizzle ORM (`src/db/schema.ts`)
- **Storage:** Vercel Blob (`@vercel/blob`)
- **Compression:** `browser-image-compression`
- **Auth:** `APP_PASSCODE` + `jose` JWT cookies
- **Export:** `jszip`

---

## Quick 4-Step Vercel Deployment Guide

1. Push this repository to GitHub and import it into **Vercel**.
2. In the Vercel Project Dashboard, open the **Storage** tab and connect:
   - **Neon Postgres** (or Vercel Postgres)
   - **Vercel Blob**
3. Add `APP_PASSCODE` and `JWT_SECRET` in **Settings → Environment Variables** (see `.env.example`).
4. Run `npx drizzle-kit push` once (or include it in your build command) and open the deployed URL on your phone to add it to your Home Screen.

---

## Local Development

1. Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

2. Push the database schema to Neon Postgres:

```bash
npx drizzle-kit push
```

3. Start the development server:

```bash
npm run dev
```
