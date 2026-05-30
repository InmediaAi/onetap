# OneTap Atelier

**The right answer. Chosen for you.**

A curated luxury fashion *discovery + identity-generation* experience — not a marketplace. Affluent women see a considered piece, visualize themselves wearing it via AI in one tap, and share the result. Quiet-luxury aesthetic (Net-a-Porter / The Row / Hermès): white space, editorial type, no clutter.

## Run it (one command, zero setup)

```bash
npm install && npm run dev
```

Open http://localhost:3000. With no API keys, all three generations use **mock providers** (curated placeholder assets, ~3.5s simulated delay) so the entire flow works offline.

## The flow

1. **Onboarding** (`/onboarding`) — upload your portrait once; stored locally.
2. **Landing** (`/`) — editorial hero + 4-column luxury grid. Tap any card's **OneTap Try-On** (first try-on routes you through onboarding).
3. **Try-On modal** — product on the left; your saved portrait + three options on the right:
   - **Photo Try-On** → editorial image
   - **360° Spin** → rotating video
   - **Social Video** → ~10s clip
4. **Share** — Instagram / TikTok / Pinterest / Copy Link → public `/look/[id]` page.

## Going live (optional)

Copy `.env.example` → `.env.local` and add keys:

| Feature | Provider | Keys |
| --- | --- | --- |
| Photo Try-On | xAI / Grok image | `XAI_API_KEY` |
| 360 Spin + Social Video | Kling image→video | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` |

Restart `npm run dev`. The provider registry (`lib/ai/index.ts`) auto-selects a real provider when its keys are present and falls back to mock otherwise — no code changes.

## Architecture

```
app/                      App Router pages + API routes
  api/generate-image      → generateTryOn()
  api/generate-360        → generate360()
  api/generate-video      → generateVideo()
components/                Header, Hero, ProductGrid, ProductCard, TryOnModal,
                           UploadZone, GenerationOptions, GeneratedResult, ShareButtons
lib/ai/                    Swappable provider layer
  types.ts                 TryOnProvider / VideoProvider interfaces
  index.ts                 env-driven registry + mock fallback
  providers/               grok.ts · kling.ts · mock.ts
lib/data/products.ts       Mock luxury catalog
lib/store.ts               Zustand (portrait + generated looks, persisted)
lib/supabase/schema.sql    Delivered schema (not wired in MVP)
```

**Swap providers** (OpenAI / Runway / Pika / Luma): implement `TryOnProvider` or `VideoProvider`, then add a case in `lib/ai/index.ts`. UI and API routes never reference a concrete provider.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind · Framer Motion · Zustand · React Hook Form. Fonts: Playfair Display + Inter.

> Note: the spec targeted Next.js 15, but the pinned 15.x release carries a published CVE, so the project runs on the patched Next 16 line (drop-in compatible here).

## Notes & roadmap

- **Storage:** MVP keeps portrait + looks in `localStorage`, so shared `/look/[id]` links resolve on the creating device. Cross-device sharing arrives by wiring `lib/supabase/schema.sql`.
- **Cost control:** to gate 360 Spin / Social Video behind a waitlist for the first 100 users, swap those options for an email capture — all three already route through the provider layer, so it's a UI-only change.

## Deploy (Vercel)

```bash
npm i -g vercel
vercel
```

Add any live-mode env vars in the Vercel project settings, then `vercel --prod`.
