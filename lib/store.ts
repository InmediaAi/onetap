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
  setPortrait: (dataUrl: string) => void;
  clearPortrait: () => void;
  addLook: (look: GeneratedLook) => void;
  getLook: (id: string) => GeneratedLook | undefined;
}

export const useAtelier = create<AtelierState>()(
  persist(
    (set, get) => ({
      portrait: null,
      looks: [],
      setPortrait: (dataUrl) => set({ portrait: dataUrl }),
      clearPortrait: () => set({ portrait: null }),
      addLook: (look) => set((s) => ({ looks: [look, ...s.looks] })),
      getLook: (id) => get().looks.find((l) => l.id === id),
    }),
    { name: "onetap-atelier" },
  ),
);
