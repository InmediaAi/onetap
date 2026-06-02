"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  PersonStanding,
  Sparkles,
  Leaf,
  MapPin,
  Building2,
  Wand2,
  Upload,
  LayoutGrid,
  Check,
  Copy,
  SlidersHorizontal,
  Shirt,
  Briefcase,
  Wind,
  Sun,
  Moon,
  Heart,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Header from "@/components/Header";

/* ---------------------------------------------------------------------------
   DATA — curated garments. `desc` feeds the generated prompt.
--------------------------------------------------------------------------- */
type Curated = { id: string; label: string; desc: string; icon: LucideIcon };

const CURATED: Curated[] = [
  { id: "c1", label: "Ivory satin slip dress", desc: "Floor-length, bias-cut, ivory satin", icon: Shirt },
  { id: "c2", label: "Black blazer co-ord", desc: "Tailored black blazer & wide-leg trouser", icon: Briefcase },
  { id: "c3", label: "Champagne column gown", desc: "Sleeveless, structured, champagne silk", icon: Sparkles },
  { id: "c4", label: "Camel wool coat", desc: "Oversized, double-breasted, camel wool", icon: Wind },
  { id: "c5", label: "White linen shirt dress", desc: "Relaxed, midi-length, crisp white linen", icon: Sun },
  { id: "c6", label: "Midnight blue gown", desc: "Draped one-shoulder, deep navy crepe", icon: Moon },
  { id: "c7", label: "Nude bodycon dress", desc: "Fitted, stretch fabric, nude/blush tone", icon: Heart },
  { id: "c8", label: "Red power suit", desc: "Sharp shoulders, wide leg, cherry red", icon: Zap },
];

/* ---------------------------------------------------------------------------
   DATA — reel formats. Each has option fields + a build() that returns the
   raw prompt string. UI renders itself from this array.
--------------------------------------------------------------------------- */
type Field = { id: string; label: string; multi: boolean; opts: string[] };
type Opts = Record<string, string | string[] | null>;
type Format = {
  id: string;
  icon: LucideIcon;
  name: string;
  sub: string;
  hot: boolean;
  note: string;
  fields: Field[];
  build: (o: Opts, gd: string) => string;
};

const arr = (v: string | string[] | null) => (Array.isArray(v) ? v : []);
const one = (v: string | string[] | null, fallback: string) =>
  (typeof v === "string" && v ? v : fallback).toLowerCase();

const TYPES: Format[] = [
  {
    id: "cinematic", icon: Camera, name: "Cinematic showcase", sub: "360° walk · brand campaign", hot: false,
    note: "Model wears your garment, slow cinematic 360°",
    fields: [
      { id: "setting", label: "Setting", multi: false, opts: ["Luxury office", "Minimal studio", "Hotel lobby", "Marble interior", "Rooftop terrace"] },
      { id: "pacing", label: "Pacing", multi: false, opts: ["Ultra slow & cinematic", "Slow & controlled", "Moderate editorial"] },
      { id: "shots", label: "Shot focus", multi: true, opts: ["Full 360° turn", "Walk toward camera", "Fabric close-up", "Back reveal", "Seated elegance"] },
      { id: "enh", label: "Enhancements", multi: true, opts: ["Slow-motion turns", "Wind effect", "Shallow bokeh", "Warm golden tones"] },
    ],
    build: (o, gd) =>
      `Cinematic luxury fashion campaign video. An elegant poised female model wearing ${gd} in a ${one(o.setting, "luxury interior")} with soft natural light and shallow depth of field. Pacing: ${one(o.pacing, "slow & controlled")}. Shot sequence: ${arr(o.shots).length ? arr(o.shots).join(", ") : "full 360° turn, walk toward camera, fabric close-up"}. Slow dolly and gentle tracking camera — zero jump cuts. Fabric drape and movement foregrounded in every frame. Model: calm, composed, utterly confident. ${arr(o.enh).length ? "Enhancements: " + arr(o.enh).join(", ") + "." : ""} 4K cinematic output, no text overlays, no logos.`,
  },
  {
    id: "runway", icon: PersonStanding, name: "Runway model", sub: "Catwalk walk · fashion show energy", hot: true,
    note: "Model walks a runway in your garment — show or editorial",
    fields: [
      { id: "runway", label: "Runway type", multi: false, opts: ["Fashion show catwalk", "Editorial runway", "Outdoor runway", "Showroom walk", "Intimate studio walk"] },
      { id: "bg", label: "Backdrop", multi: false, opts: ["Grand show venue", "White minimal runway", "Black dramatic runway", "Outdoor terrace runway", "Gallery / museum space"] },
      { id: "crowd", label: "Atmosphere", multi: false, opts: ["Fashion show audience (blurred)", "Empty runway — editorial", "Sparse intimate crowd", "Press & photographers at end"] },
      { id: "finale", label: "End moment", multi: false, opts: ["Pause & hold at camera", "Slow turn at runway end", "Return walk away", "Close-up on garment detail"] },
    ],
    build: (o, gd) =>
      `Luxury runway fashion video. An elegant, statuesque female model wearing ${gd} walks a ${one(o.runway, "fashion show catwalk")}. Setting: ${one(o.bg, "grand show venue")} with controlled dramatic lighting — strong frontal key light, soft fill from sides. Atmosphere: ${one(o.crowd, "fashion show audience (blurred)")} in the background, softly out of focus. Model walks with total authority — long confident strides, straight posture, slight shoulder movement. Camera: slow dolly tracking at mid-distance, full body visible, then cuts to mid-shot as she approaches, ending with ${one(o.finale, "pause & hold at camera")}. Fabric movement captured as she walks — drape, flow, structure all visible. No fast cuts. Cinematic 4K. This is a luxury fashion show, not a commercial.`,
  },
  {
    id: "reveal", icon: Sparkles, name: "Outfit reveal", sub: "Dramatic reveal · shareable moment", hot: true,
    note: "Single powerful reveal of your garment — one clean moment",
    fields: [
      { id: "style", label: "Reveal style", multi: false, opts: ["Slow camera pan upward", "Turn-around reveal", "Walk into frame", "Fabric drop / uncover", "Silhouette to full reveal"] },
      { id: "bg", label: "Backdrop", multi: false, opts: ["Neutral ivory / white", "Dark & moody", "Outdoor golden light", "Luxury interior"] },
      { id: "energy", label: "Model energy", multi: false, opts: ["Composed & editorial", "Confident & commanding", "Soft & dreamy", "Fierce & powerful"] },
      { id: "end", label: "Ending shot", multi: false, opts: ["Hold on full look", "Slow walk away", "Fabric detail close-up", "Direct look to camera"] },
    ],
    build: (o, gd) =>
      `Luxury outfit reveal video. A striking female model wearing ${gd}. Reveal: ${one(o.style, "slow camera pan upward")}. Backdrop: ${one(o.bg, "neutral ivory")} with soft controlled lighting. Model energy: ${one(o.energy, "composed & editorial")}. Video builds anticipation — slow, deliberate — emphasising silhouette, fit, and fabric quality throughout. Ending: ${one(o.end, "hold on full look")}. Smooth camera movement only, zero fast cuts. The garment commands every frame. Ultra-realistic 4K.`,
  },
  {
    id: "slowliving", icon: Leaf, name: "Slow living / aesthetic", sub: "Atmospheric B-roll · no script", hot: true,
    note: "Garment lives naturally in a beautiful scene — pure atmosphere",
    fields: [
      { id: "setting", label: "Setting", multi: false, opts: ["Morning apartment / home", "Café / patisserie", "Garden / terrace", "Bookshop / gallery", "Coastal / nature", "Hotel room morning"] },
      { id: "activity", label: "Activities", multi: true, opts: ["Morning coffee ritual", "Reading / journaling", "Walking slowly", "Arranging flowers", "Looking out window", "Hands on fabric"] },
      { id: "light", label: "Lighting", multi: false, opts: ["Soft morning window light", "Golden hour", "Overcast diffused", "Warm candlelit"] },
      { id: "pace", label: "Pacing", multi: false, opts: ["Extremely slow & meditative", "Slow & dreamy", "Unhurried & calm"] },
    ],
    build: (o, gd) =>
      `Slow living aesthetic fashion video. A serene, naturally beautiful female model wearing ${gd} in a ${one(o.setting, "morning apartment")}. Activities: ${arr(o.activity).length ? arr(o.activity).join(", ") : "morning coffee ritual, looking out window"}. Lighting: ${one(o.light, "soft morning window light")}. Pacing: ${one(o.pace, "slow & dreamy")} — this is atmosphere, not content. Camera: gentle drifting movement, extreme close-ups on fabric texture, hands, and quiet detail. No posing, no performance — the garment lives naturally in the scene. Cinematic 4K. Quiet, beautiful, worth stopping for.`,
  },
  {
    id: "streetstyle", icon: MapPin, name: "Street style", sub: "City walk · editorial outdoor", hot: false,
    note: "Model in your garment, walking real city environment",
    fields: [
      { id: "loc", label: "Location", multi: false, opts: ["European cobblestone", "Modern glass city", "Luxury shopping district", "Minimalist architecture", "Coastal promenade"] },
      { id: "time", label: "Time of day", multi: false, opts: ["Golden hour", "Bright midday", "Overcast editorial", "Blue hour / dusk"] },
      { id: "movement", label: "Movement", multi: true, opts: ["Walking toward camera", "Walking away", "Crossing street", "Pausing / looking off-frame", "Entering a building"] },
      { id: "style", label: "Edit style", multi: false, opts: ["Candid & natural", "Polished editorial", "Fashion week walk", "Paparazzi-style"] },
    ],
    build: (o, gd) =>
      `Street style luxury fashion video. An effortlessly stylish female model wearing ${gd} on ${one(o.loc, "European cobblestone streets")} during ${one(o.time, "golden hour")}. Edit style: ${one(o.style, "polished editorial")}. Movement: ${arr(o.movement).length ? arr(o.movement).join(", ") : "walking toward camera, pausing / looking off-frame"}. Camera follows naturally — wide establishing, mid-body tracking, spontaneous detail shots. Shallow depth of field blurs environment softly. Natural ambient light throughout. The outfit always clearly visible, perfectly styled. Cinematic 4K. No rigs visible. Authentic luxury street presence.`,
  },
  {
    id: "fashionweek", icon: Building2, name: "Fashion week moment", sub: "Front row · event · street energy", hot: true,
    note: "Your garment in a fashion week context — arrival, street, event",
    fields: [
      { id: "city", label: "City", multi: false, opts: ["Paris", "Milan", "London", "New York", "Copenhagen"] },
      { id: "context", label: "Scene", multi: false, opts: ["Front row arrival", "Street style walk outside venue", "Show exit crowd moment", "Hotel lobby departure", "Showroom / preview visit"] },
      { id: "outfit", label: "Outfit energy", multi: false, opts: ["Quiet luxury statement", "Bold maximalist", "European minimal", "All-black power look"] },
      { id: "cam", label: "Camera style", multi: false, opts: ["Candid documentary", "Polished editorial", "Slow cinematic", "Paparazzi-style"] },
    ],
    build: (o, gd) =>
      `Fashion week luxury video set in ${(typeof o.city === "string" && o.city) || "Paris"}. A fashion-forward, elegantly dressed female model wearing ${gd}, outfit energy: ${one(o.outfit, "quiet luxury statement")}. Scene: ${one(o.context, "front row arrival")}. Camera style: ${one(o.cam, "polished editorial")}. Ambient city energy — architecture, blurred crowd, soft movement. Model navigates the environment with total ease and composure. Mix of wide establishing, mid-body movement, and close detail on outfit and accessories. Natural ambient light. Cinematic 4K. Fashion week energy — controlled, aspirational, editorial.`,
  },
  {
    id: "grwm", icon: Wand2, name: "GRWM", sub: "Get ready · personal & real", hot: true,
    note: "Model styling your garment in a real getting-ready moment",
    fields: [
      { id: "occasion", label: "Occasion", multi: false, opts: ["Luxury dinner", "Office / workday", "Weekend brunch", "Gala / event", "Casual luxury day"] },
      { id: "loc", label: "Setting", multi: false, opts: ["Luxury dressing room", "Hotel suite", "Minimalist vanity", "Bright airy studio"] },
      { id: "mood", label: "Mood", multi: false, opts: ["Calm & aspirational", "Confident & powerful", "Soft & feminine", "Cool & editorial"] },
      { id: "beats", label: "Key moments", multi: true, opts: ["Trying on", "Mirror check", "Jewellery close-up", "Final look walk-away", "Perfume finishing touch"] },
    ],
    build: (o, gd) =>
      `GRWM luxury fashion video for ${(typeof o.occasion === "string" && o.occasion) || "a luxury event"}. A stylish refined female model in a ${one(o.loc, "luxury dressing room")} styling ${gd}. Mood: ${one(o.mood, "calm & aspirational")}. Natural sequence: ${arr(o.beats).length ? arr(o.beats).join(", ") : "trying on, mirror check, final look walk-away"}. Camera: handheld-steady, intimate close-ups on fabric texture, hands, mirror reflections. Warm personal lighting. Movement feels natural and unhurried. Final shot: confident full-length mirror look. Cinematic quality — personal yet aspirational.`,
  },
];

/* ------------------------------------------------------------------------- */

export default function CreatorPage() {
  const [selType, setSelType] = useState<string | null>(null);
  const [opts, setOpts] = useState<Opts>({});
  const [garmentTab, setGarmentTab] = useState<"upload" | "curated">("upload");
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgName, setImgName] = useState<string>("");
  const [curatedSel, setCuratedSel] = useState<Curated | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = TYPES.find((t) => t.id === selType) ?? null;

  function pickType(id: string) {
    setSelType(id);
    setOpts({});
    setResult(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgPreview(ev.target?.result as string);
      setImgName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function toggleChip(fieldId: string, val: string, multi: boolean) {
    setOpts((prev) => {
      if (!multi) return { ...prev, [fieldId]: prev[fieldId] === val ? null : val };
      const current = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
      return { ...prev, [fieldId]: next };
    });
  }

  function isOn(fieldId: string, val: string) {
    const v = opts[fieldId];
    return Array.isArray(v) ? v.includes(val) : v === val;
  }

  function garmentDesc() {
    if (garmentTab === "upload" && imgPreview) return "the exact uploaded garment (reference image provided)";
    if (garmentTab === "curated" && curatedSel) return `${curatedSel.desc} (${curatedSel.label})`;
    return "a luxury garment";
  }

  function generate() {
    const hasGarment = (garmentTab === "upload" && imgPreview) || (garmentTab === "curated" && curatedSel);
    if (!hasGarment) {
      alert("Please upload your garment or select from the curated collection.");
      return;
    }
    if (!cfg) return;
    setResult(cfg.build(opts, garmentDesc()));
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main>
      <Header />

      <div className="mx-auto max-w-2xl px-6 pb-28 pt-16 md:pt-20">
        {/* Masthead */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="border-b border-hairline pb-8"
        >
          <p className="eyebrow">OneTap Creator · Reel</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
            The <span className="italic">reel</span> builder for creators
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Turn a single garment into a directed, cinema-grade reel for AI video
            tools. Choose a format, bring your piece, set the mood — then create
            your reel.
          </p>
        </motion.header>

        {/* Step 1 — format */}
        <section className="pt-10">
          <p className="eyebrow">Step 1 — choose reel format</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Only formats AI video tools (Runway, Kling) can generate from a single
            garment image + prompt.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {TYPES.map((t) => {
              const active = selType === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => pickType(t.id)}
                  className={`relative rounded-lg border p-3 text-left transition-colors ${
                    active ? "border-ink bg-[#fafafa]" : "border-hairline hover:bg-[#fafafa]"
                  }`}
                >
                  {t.hot && (
                    <span className="absolute right-2 top-2 rounded-full border border-hairline px-2 py-0.5 text-[8px] uppercase tracking-luxe text-muted">
                      Trending
                    </span>
                  )}
                  <Icon size={20} strokeWidth={1.5} className="mb-2 text-ink" />
                  <div className="text-[13px] font-medium leading-tight">{t.name}</div>
                  <div className="mt-1 text-[11px] leading-tight text-muted">{t.sub}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2 — garment */}
        {cfg && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pt-10"
          >
            <p className="eyebrow">Step 2 — garment</p>
            <div className="mt-4 rounded-lg border border-hairline p-5">
              <div className="mb-4 flex gap-2">
                {(["upload", "curated"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGarmentTab(tab)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                      garmentTab === tab
                        ? "border-ink bg-ink text-canvas"
                        : "border-hairline text-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {tab === "upload" ? <Upload size={13} /> : <LayoutGrid size={13} />}
                    {tab === "upload" ? "Upload your piece" : "Curated collection"}
                  </button>
                ))}
              </div>

              {garmentTab === "upload" ? (
                <div>
                  {!imgPreview ? (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full flex-col items-center rounded-lg border border-dashed border-hairline px-6 py-8 text-center transition-colors hover:bg-[#fafafa]"
                    >
                      <Upload size={24} strokeWidth={1.5} className="mb-2 text-muted" />
                      <p className="text-[12px] text-muted">
                        <strong className="text-ink">Click to upload</strong> or drag &amp; drop
                      </p>
                      <p className="mt-1 text-[12px] text-muted">PNG · JPG · max 10MB</p>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgPreview} alt="garment preview" className="h-14 w-14 rounded-md border border-hairline object-cover" />
                      <div>
                        <div className="text-[12px] text-ink">{imgName}</div>
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="mt-0.5 text-[11px] text-muted underline hover:text-ink"
                        >
                          Change image
                        </button>
                      </div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  {imgPreview && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink">
                      <Check size={13} /> Image loaded — prompt will reference your exact piece
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CURATED.map((c) => {
                    const on = curatedSel?.id === c.id;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCuratedSel(c)}
                        className={`overflow-hidden rounded-md border transition-colors ${
                          on ? "border-ink" : "border-hairline hover:border-ink"
                        }`}
                      >
                        <div className="flex aspect-[3/4] items-center justify-center bg-[#fafafa]">
                          <Icon size={22} strokeWidth={1.5} className="text-muted" />
                        </div>
                        <div className={`px-1.5 py-1.5 text-center text-[11px] leading-tight ${on ? "font-medium text-ink" : "text-muted"}`}>
                          {c.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Step 3 — options */}
        {cfg && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="pt-2"
          >
            <p className="eyebrow">Step 3 — options</p>
            <div className="mt-4 rounded-lg border border-hairline p-5">
              <p className="mb-4 flex items-center gap-2 text-[13px] font-medium text-ink">
                <SlidersHorizontal size={15} />
                {cfg.note}
              </p>
              {cfg.fields.map((f) => (
                <div key={f.id} className="mb-4 last:mb-0">
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-luxe text-muted">
                    {f.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {f.opts.map((o) => {
                      const on = isOn(f.id, o);
                      return (
                        <button
                          key={o}
                          onClick={() => toggleChip(f.id, o, f.multi)}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                            on ? "border-ink font-medium text-ink" : "border-hairline text-ink hover:border-ink"
                          }`}
                        >
                          {on && <Check size={11} />}
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={generate}
              className="flex w-full items-center justify-center gap-2 bg-ink py-3 text-[12px] uppercase tracking-luxe text-canvas transition-opacity hover:opacity-80"
            >
              <Wand2 size={15} /> Create Reel
            </button>

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-6 rounded-lg border border-hairline p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-luxe text-muted">
                    Reel prompt
                  </span>
                  <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-muted">
                    Ready to use
                  </span>
                </div>
                <p className="whitespace-pre-wrap font-display text-[15px] leading-relaxed text-ink">
                  {result}
                </p>
                <button
                  onClick={copy}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy prompt"}
                </button>
              </motion.div>
            )}
          </motion.section>
        )}
      </div>
    </main>
  );
}
