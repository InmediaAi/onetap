import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenerationKind } from "@/lib/ai/types";

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
  looks: GeneratedLook[];
  /** Saved product ids (the wishlist / bag count). */
  wishlist: string[];
  /** The user's uploaded closet — their own clothes/images (data URLs). */
  closet: string[];
  setPortrait: (dataUrl: string) => void;
  clearPortrait: () => void;
  addLook: (look: GeneratedLook) => void;
  getLook: (id: string) => GeneratedLook | undefined;
  toggleWish: (productId: string) => void;
  addCloset: (dataUrl: string) => void;
  removeCloset: (dataUrl: string) => void;
}

export const useAtelier = create<AtelierState>()(
  persist(
    (set, get) => ({
      portrait: null,
      looks: [],
      wishlist: [],
      closet: [],
      setPortrait: (dataUrl) => set({ portrait: dataUrl }),
      clearPortrait: () => set({ portrait: null }),
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
    }),
    { name: "onetap-atelier" },
  ),
);
