"use client";

import { Sparkles, RotateCw, Clapperboard } from "lucide-react";
import type { GenerationKind } from "@/lib/ai/types";

interface Option {
  kind: GenerationKind;
  title: string;
  description: string;
  icon: typeof Sparkles;
}

const OPTIONS: Option[] = [
  {
    kind: "tryon",
    title: "Photo Try-On",
    description: "Generate an editorial image wearing the selected piece.",
    icon: Sparkles,
  },
  {
    kind: "spin",
    title: "360° Spin",
    description: "Generate a rotating fashion preview of your look.",
    icon: RotateCw,
  },
  {
    kind: "video",
    title: "Social Video",
    description: "Generate a 10-second luxury fashion clip to share.",
    icon: Clapperboard,
  },
];

export default function GenerationOptions({
  onSelect,
  disabled,
}: {
  onSelect: (kind: GenerationKind) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map(({ kind, title, description, icon: Icon }) => (
        <button
          key={kind}
          disabled={disabled}
          onClick={() => onSelect(kind)}
          className="group flex items-center gap-4 border border-hairline px-5 py-4 text-left transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-hairline transition-colors group-hover:border-ink">
            <Icon size={17} strokeWidth={1.5} />
          </span>
          <span>
            <span className="block text-sm font-medium">{title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted">
              {description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
