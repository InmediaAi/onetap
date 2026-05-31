import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenerationKind } from "@/lib/ai/types";
import { STARTING_CREDITS } from "@/lib/credits";

export interface GeneratedLook {
  id: string;
  productId: string;
  kind: GenerationKind;
  /** The portrait used as input (data URL). */
  inputImage: string;
  /** Result — image for try-on, video URL for spin/video. */
  assetUrl: string;
  posterUrl?: string;
  createdAt: number;
}

interface AtelierState {
  /** User portrait captured once during onboarding (data URL). */
  portrait: string | null;
  /** Onboarding identity: face selfie (recognition) + full-body (shape). */
  face: string | null;
  body: string | null;
  /** Whether the user has completed (mock) sign-in. */
  signedIn: boolean;
  looks: GeneratedLook[];
  /** Saved product ids (the wishlist / bag count). */
  wishlist: string[];
  /** The user's uploaded closet — their own clothes/images (data URLs). */
  closet: string[];
  /** Credit balance (the spend currency for generations). */
  credits: number;
  /** Transient UI: whether the Pricing/top-up modal is open (not persisted). */
  pricingOpen: boolean;
  setPortrait: (dataUrl: string) => void;
  clearPortrait: () => void;
  signIn: () => void;
  /** Save the two onboarding photos; full-body becomes the try-on likeness. */
  setIdentity: (face: string | null, body: string | null) => void;
  addLook: (look: GeneratedLook) => void;
  getLook: (id: string) => GeneratedLook | undefined;
  toggleWish: (productId: string) => void;
  addCloset: (dataUrl: string) => void;
  removeCloset: (dataUrl: string) => void;
  /** Add credits (mock top-up). */
  topUp: (amount: number) => void;
  /** Deduct n credits; returns false (and changes nothing) if balance is short. */
  spendCredits: (n: number) => boolean;
  openPricing: () => void;
  closePricing: () => void;
}

export const useAtelier = create<AtelierState>()(
  persist(
    (set, get) => ({
      portrait: null,
      face: null,
      body: null,
      signedIn: false,
      looks: [],
      wishlist: [],
      closet: [],
      credits: STARTING_CREDITS,
      pricingOpen: false,
      setPortrait: (dataUrl) => set({ portrait: dataUrl }),
      clearPortrait: () => set({ portrait: null }),
      signIn: () => set({ signedIn: true }),
      setIdentity: (face, body) =>
        set({ face, body, portrait: body ?? face ?? null }),
      addLook: (look) => set((s) => ({ looks: [look, ...s.looks] })),
      getLook: (id) => get().looks.find((l) => l.id === id),
      toggleWish: (productId) =>
        set((s) => ({
          wishlist: s.wishlist.includes(productId)
            ? s.wishlist.filter((id) => id !== productId)
            : [...s.wishlist, productId],
        })),
      addCloset: (dataUrl) =>
        set((s) =>
          s.closet.includes(dataUrl)
            ? s
            : { closet: [dataUrl, ...s.closet] },
        ),
      removeCloset: (dataUrl) =>
        set((s) => ({ closet: s.closet.filter((u) => u !== dataUrl) })),
      topUp: (amount) => set((s) => ({ credits: s.credits + amount })),
      spendCredits: (n) => {
        if (get().credits < n) return false;
        set((s) => ({ credits: s.credits - n }));
        return true;
      },
      openPricing: () => set({ pricingOpen: true }),
      closePricing: () => set({ pricingOpen: false }),
    }),
    {
      name: "onetap-atelier",
      // Persist data only — never the transient Pricing modal flag.
      partialize: (s) => ({
        portrait: s.portrait,
        face: s.face,
        body: s.body,
        signedIn: s.signedIn,
        looks: s.looks,
        wishlist: s.wishlist,
        closet: s.closet,
        credits: s.credits,
      }),
    },
  ),
);
