import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenerationKind } from "@/lib/ai/types";
import type { PlanId } from "@/lib/pricing/plans";
import { SEED_CONFIG } from "@/lib/pricing/plans";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

export interface GeneratedLook {
  id: string;
  productId: string;
  kind: GenerationKind;
  /** The portrait used as input (data/hosted URL). */
  inputImage: string;
  /** Result — image for try-on, video URL for spin/video. */
  assetUrl: string;
  posterUrl?: string;
  createdAt: number;
}

/** Display-only snapshot of the user's subscription + usage (server is authoritative). */
export interface UsageSnapshot {
  planId: PlanId | null;
  planName: string | null;
  status: string | null; // active | cancelled | halted | created | null
  /** True once the user has scheduled a cancellation (active until period end). */
  cancelAtPeriodEnd: boolean;
  videosUsed: number;
  videoLimit: number;
  /** Roll-over paid extras, consumed after the monthly allowance. */
  topupBalance: number;
  topupUnitPrice: number;
  topupCurrency: string;
  topupEnabled: boolean;
  currentPeriodEnd: string | null;
  freeTrialRemaining: number;
}

/** Shape pushed by SessionLoader from GET /api/me. */
export interface ProfileSnapshot {
  onboarded: boolean;
  username: string | null;
  email: string | null;
  brands: string[];
  /** Signed URLs (or data URLs) for the identity images. */
  selfieUrl: string | null;
  bodyUrl: string | null;
  leftUrl: string | null;
  rightUrl: string | null;
  backUrl: string | null;
  /** System-derived combined avatar (read-only). */
  modelUrl: string | null;
  heightInches: number | null;
  style: string[];
  categories: string[];
  goals: string[];
  sceneMood: string[];
  sceneSetting: string[];
  usage: UsageSnapshot;
}

/** The editable taste/identity fields the Profile saves. */
export interface ProfileFields {
  username: string | null;
  heightInches: number | null;
  style: string[];
  categories: string[];
  goals: string[];
  sceneMood: string[];
  sceneSetting: string[];
}

const EMPTY_USAGE: UsageSnapshot = {
  planId: null,
  planName: null,
  status: null,
  cancelAtPeriodEnd: false,
  videosUsed: 0,
  videoLimit: 0,
  topupBalance: 0,
  topupUnitPrice: SEED_CONFIG.topupUnitPrice,
  topupCurrency: SEED_CONFIG.topupCurrency,
  topupEnabled: SEED_CONFIG.topupEnabled,
  currentPeriodEnd: null,
  freeTrialRemaining: 0,
};

interface AtelierState {
  // ── Identity (in-memory; server-owned via Supabase, not persisted locally) ──
  /** The try-on likeness (full-body preferred, else selfie). data/hosted URL. */
  portrait: string | null;
  face: string | null;
  body: string | null;
  left: string | null;
  right: string | null;
  back: string | null;
  /** System-derived combined avatar (read-only; set on generate). */
  modelUrl: string | null;
  brands: string[];
  username: string | null;
  email: string | null;
  heightInches: number | null;
  style: string[];
  categories: string[];
  goals: string[];
  sceneMood: string[];
  sceneSetting: string[];
  /** Whether the user has completed onboarding (returning vs first-time). */
  onboarded: boolean;
  /** Subscription + usage snapshot for display. */
  usage: UsageSnapshot;
  /** Whether SessionLoader has resolved the auth state at least once. */
  profileLoaded: boolean;

  // ── Local UX (persisted) ──
  looks: GeneratedLook[];
  wishlist: string[];
  closet: string[];
  /** looks.length at the user's last closet visit — drives the unseen badge. */
  closetSeen: number;

  // ── Transient UI ──
  pricingOpen: boolean;
  signInOpen: boolean;

  // ── Setters ──
  setPortrait: (url: string) => void;
  clearPortrait: () => void;
  setIdentity: (face: string | null, body: string | null) => void;
  setBrands: (brands: string[]) => void;
  /** Set the system-derived model sheet URL after it is generated. */
  setModelUrl: (url: string | null) => void;
  /** Merge edited taste/identity fields into the in-memory profile. */
  applyProfile: (p: Partial<ProfileFields>) => void;
  /** Hydrate identity + usage from the authenticated profile (GET /api/me). */
  hydrateProfile: (p: ProfileSnapshot) => void;
  /** Fetch GET /api/me and hydrate (or reset) the session. */
  refreshProfile: () => Promise<void>;
  /** Clear in-memory identity on sign-out. */
  resetSession: () => void;
  addLook: (look: GeneratedLook) => void;
  getLook: (id: string) => GeneratedLook | undefined;
  /** Mark the closet as seen (clears the unseen-looks badge in the header). */
  markClosetSeen: () => void;
  toggleWish: (productId: string) => void;
  addCloset: (dataUrl: string) => void;
  removeCloset: (dataUrl: string) => void;
  openPricing: () => void;
  closePricing: () => void;
  openSignIn: () => void;
  closeSignIn: () => void;
}

export const useAtelier = create<AtelierState>()(
  persist(
    (set, get) => ({
      portrait: null,
      face: null,
      body: null,
      left: null,
      right: null,
      back: null,
      modelUrl: null,
      brands: [],
      username: null,
      email: null,
      heightInches: null,
      style: [],
      categories: [],
      goals: [],
      sceneMood: [],
      sceneSetting: [],
      onboarded: false,
      usage: EMPTY_USAGE,
      profileLoaded: false,
      looks: [],
      wishlist: [],
      closet: [],
      closetSeen: 0,
      pricingOpen: false,
      signInOpen: false,

      setPortrait: (url) => set({ portrait: url }),
      clearPortrait: () => set({ portrait: null }),
      setIdentity: (face, body) => {
        set({ face, body, portrait: body ?? face ?? null });
        track(EVENTS.IDENTITY_CAPTURED, {
          hasFace: Boolean(face),
          hasBody: Boolean(body),
        });
      },
      setBrands: (brands) => {
        set({ brands });
        track(EVENTS.ONBOARDING_BRANDS_SELECTED, { count: brands.length });
      },
      setModelUrl: (url) => set({ modelUrl: url }),
      applyProfile: (p) => set((s) => ({ ...s, ...p })),
      hydrateProfile: (p) =>
        set({
          username: p.username,
          email: p.email,
          brands: p.brands,
          face: p.selfieUrl,
          body: p.bodyUrl,
          left: p.leftUrl,
          right: p.rightUrl,
          back: p.backUrl,
          modelUrl: p.modelUrl,
          portrait: p.bodyUrl ?? p.selfieUrl ?? get().portrait,
          heightInches: p.heightInches,
          style: p.style,
          categories: p.categories,
          goals: p.goals,
          sceneMood: p.sceneMood,
          sceneSetting: p.sceneSetting,
          onboarded: p.onboarded,
          usage: p.usage,
          profileLoaded: true,
        }),
      refreshProfile: async () => {
        try {
          // no-store: never reuse a cached session snapshot (else a soft reload
          // after subscribe/sign-in serves stale usage/profile).
          const r = await fetch("/api/me", { cache: "no-store" });
          const d = r.ok ? await r.json() : null;
          if (!d) return;
          if (d.authed) {
            get().hydrateProfile({
              username: d.username,
              email: d.email,
              brands: d.brands ?? [],
              selfieUrl: d.selfieUrl ?? null,
              bodyUrl: d.bodyUrl ?? null,
              leftUrl: d.leftUrl ?? null,
              rightUrl: d.rightUrl ?? null,
              backUrl: d.backUrl ?? null,
              modelUrl: d.modelUrl ?? null,
              heightInches: d.heightInches ?? null,
              style: d.style ?? [],
              categories: d.categories ?? [],
              goals: d.goals ?? [],
              sceneMood: d.sceneMood ?? [],
              sceneSetting: d.sceneSetting ?? [],
              onboarded: Boolean(d.onboarded),
              usage: d.usage,
            });
          } else {
            get().resetSession();
          }
        } catch {
          /* offline / unconfigured — leave state as-is */
        }
      },
      resetSession: () =>
        set({
          portrait: null,
          face: null,
          body: null,
          left: null,
          right: null,
          back: null,
          modelUrl: null,
          brands: [],
          username: null,
          email: null,
          heightInches: null,
          style: [],
          categories: [],
          goals: [],
          sceneMood: [],
          sceneSetting: [],
          onboarded: false,
          usage: EMPTY_USAGE,
          profileLoaded: true,
        }),

      addLook: (look) => {
        set((s) => ({ looks: [look, ...s.looks] }));
        track(EVENTS.LOOK_CREATED, {
          lookId: look.id,
          productId: look.productId,
          kind: look.kind,
        });
      },
      getLook: (id) => get().looks.find((l) => l.id === id),
      markClosetSeen: () => set({ closetSeen: get().looks.length }),
      toggleWish: (productId) => {
        const wasWished = get().wishlist.includes(productId);
        set((s) => ({
          wishlist: wasWished
            ? s.wishlist.filter((id) => id !== productId)
            : [...s.wishlist, productId],
        }));
        track(
          wasWished ? EVENTS.PRODUCT_UNWISHLISTED : EVENTS.PRODUCT_WISHLISTED,
          { productId },
        );
      },
      addCloset: (dataUrl) =>
        set((s) =>
          s.closet.includes(dataUrl) ? s : { closet: [dataUrl, ...s.closet] },
        ),
      removeCloset: (dataUrl) =>
        set((s) => ({ closet: s.closet.filter((u) => u !== dataUrl) })),
      openPricing: () => {
        set({ pricingOpen: true });
        track(EVENTS.PRICING_OPENED);
      },
      closePricing: () => set({ pricingOpen: false }),
      openSignIn: () => {
        set({ signInOpen: true });
        track(EVENTS.SIGN_IN_REQUIRED);
      },
      closeSignIn: () => set({ signInOpen: false }),
    }),
    {
      name: "onetap-atelier",
      // Persist only device-local UX. Identity + usage are server-owned and
      // hydrated after login (SessionLoader → /api/me).
      partialize: (s) => ({
        looks: s.looks,
        wishlist: s.wishlist,
        closet: s.closet,
        closetSeen: s.closetSeen,
      }),
    },
  ),
);
