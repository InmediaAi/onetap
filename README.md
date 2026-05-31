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

Generation is **purely env-driven** — pick a provider and model per modality. Copy `.env.example` → `.env.local`:

| Modality | `*_PROVIDER` | `*_MODEL` | Keys |
| --- | --- | --- | --- |
| Photo Try-On | `TRYON_PROVIDER` (`mock` \| `grok`) | `TRYON_MODEL` | `XAI_API_KEY` |
| 360 Spin + Social Video | `VIDEO_PROVIDER` (`mock` \| `kling`) | `VIDEO_MODEL` | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` |

Default (nothing set) = **mock**, so the app runs with zero config. Selecting a real provider **fails loud** if its keys are missing (no silent mock fallback) — so you always know which model ran. Check what's live at **`GET /api/ai-status`** (dev only). Restart `npm run dev` after changing env.

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
  index.ts                 env-driven registry (provider + model) + /api/ai-status
  providers/               grok.ts · kling.ts · mock.ts
lib/data/products.ts       Mock luxury catalog
lib/store.ts               Zustand (portrait + generated looks, persisted)
lib/supabase/schema.sql    Delivered schema (not wired in MVP)
```

**Add a model/provider** (OpenAI / Runway / Pika / Luma): (1) implement `TryOnProvider` or `VideoProvider` in `lib/ai/providers/`; (2) add **one entry** to the registry map in `lib/ai/index.ts` (`requiredEnv` + `create`); (3) select it via env (`TRYON_PROVIDER`/`VIDEO_PROVIDER` + `*_MODEL`). UI and API routes never reference a concrete provider.

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
