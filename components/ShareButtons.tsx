"use client";

import { useState } from "react";
import { Instagram, Music2, Link2, Check } from "lucide-react";

export default function ShareButtons({ lookId }: { lookId: string }) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/look/${lookId}`
      : `/look/${lookId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const channels = [
    { label: "Instagram", icon: Instagram, href: "https://www.instagram.com/" },
    { label: "TikTok", icon: Music2, href: "https://www.tiktok.com/upload" },
    {
      label: "Pinterest",
      icon: () => <span className="text-[13px] font-semibold">P</span>,
      href: `https://www.pinterest.com/pin-builder/?url=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow">Share Look</p>
      <div className="flex flex-wrap gap-3">
        {channels.map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost gap-2"
          >
            <Icon size={15} strokeWidth={1.5} />
            {label}
          </a>
        ))}
        <button onClick={copy} className="btn-ghost gap-2">
          {copied ? <Check size={15} strokeWidth={1.5} /> : <Link2 size={15} strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
