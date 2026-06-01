import {
  Camera,
  Footprints,
  Sparkles,
  Leaf,
  MapPin,
  Building2,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/**
 * Film (influencer reel) formats — ported from the OneTap Reel builder.
 * Each format has option fields (rendered as chips) and a build() that returns
 * cinematic prompt prose. The try-on image carries the subject + outfit, so the
 * prose directs scene / camera / pacing / mood; buildFilmPrompt() prepends an
 * instruction to preserve the person and garment from the reference image.
 */

export interface FilmField {
  id: string;
  label: string;
  multi: boolean;
  opts: string[];
}

export type FilmOpts = Record<string, string | string[] | null>;

export interface FilmFormat {
  id: string;
  label: string;
  sub: string;
  note: string;
  Icon: LucideIcon;
  fields: FilmField[];
  build: (o: FilmOpts) => string;
}

/** Read a single-select option with a fallback. */
const one = (o: FilmOpts, id: string, fallback: string) =>
  (typeof o[id] === "string" && (o[id] as string)) || fallback;

/** Read a multi-select option joined, with a fallback. */
const many = (o: FilmOpts, id: string, fallback: string) => {
  const v = o[id];
  return Array.isArray(v) && v.length ? v.join(", ") : fallback;
};

/** Phrase referring to the look in the uploaded/try-on reference image. */
const LOOK = "the look from the reference image";

export const FILM_FORMATS: FilmFormat[] = [
  {
    id: "cinematic",
    label: "Cinematic showcase",
    sub: "360° walk · brand campaign",
    note: "Slow cinematic showcase of the look",
    Icon: Camera,
    fields: [
      { id: "setting", label: "Setting", multi: false, opts: ["Luxury office", "Minimal studio", "Hotel lobby", "Marble interior", "Rooftop terrace"] },
      { id: "pacing", label: "Pacing", multi: false, opts: ["Ultra slow & cinematic", "Slow & controlled", "Moderate editorial"] },
      { id: "shots", label: "Shot focus", multi: true, opts: ["Full 360° turn", "Walk toward camera", "Fabric close-up", "Back reveal", "Seated elegance"] },
      { id: "enh", label: "Enhancements", multi: true, opts: ["Slow-motion turns", "Wind effect", "Shallow bokeh", "Warm golden tones"] },
    ],
    build: (o) =>
      `Cinematic luxury fashion campaign video. An elegant poised female model wearing ${LOOK} in a ${one(o, "setting", "luxury interior").toLowerCase()} with soft natural light and shallow depth of field. Pacing: ${one(o, "pacing", "slow & controlled").toLowerCase()}. Shot sequence: ${many(o, "shots", "full 360° turn, walk toward camera, fabric close-up")}. Slow dolly and gentle tracking camera — zero jump cuts. Fabric drape and movement foregrounded in every frame. Model: calm, composed, utterly confident.${Array.isArray(o.enh) && o.enh.length ? " Enhancements: " + (o.enh as string[]).join(", ") + "." : ""} 4K cinematic output, no text overlays, no logos.`,
  },
  {
    id: "runway",
    label: "Runway model",
    sub: "Catwalk · fashion show energy",
    note: "Model walks a runway in the look",
    Icon: Footprints,
    fields: [
      { id: "runway", label: "Runway type", multi: false, opts: ["Fashion show catwalk", "Editorial runway", "Outdoor runway", "Showroom walk", "Intimate studio walk"] },
      { id: "bg", label: "Backdrop", multi: false, opts: ["Grand show venue", "White minimal runway", "Black dramatic runway", "Outdoor terrace runway", "Gallery / museum space"] },
      { id: "crowd", label: "Atmosphere", multi: false, opts: ["Fashion show audience (blurred)", "Empty runway — editorial", "Sparse intimate crowd", "Press & photographers at end"] },
      { id: "finale", label: "End moment", multi: false, opts: ["Pause & hold at camera", "Slow turn at runway end", "Return walk away", "Close-up on garment detail"] },
    ],
    build: (o) =>
      `Luxury runway fashion video. An elegant, statuesque female model wearing ${LOOK} walks a ${one(o, "runway", "fashion show catwalk").toLowerCase()}. Setting: ${one(o, "bg", "grand show venue").toLowerCase()} with controlled dramatic lighting — strong frontal key light, soft fill from sides. Atmosphere: ${one(o, "crowd", "fashion show audience (blurred)").toLowerCase()} in the background, softly out of focus. Model walks with total authority — long confident strides, straight posture, slight shoulder movement. Camera: slow dolly tracking at mid-distance, full body visible, then cuts to mid-shot as she approaches, ending with ${one(o, "finale", "pause & hold at camera").toLowerCase()}. Fabric movement captured as she walks — drape, flow, structure all visible. No fast cuts. Cinematic 4K. This is a luxury fashion show, not a commercial.`,
  },
  {
    id: "reveal",
    label: "Outfit reveal",
    sub: "Dramatic reveal · shareable moment",
    note: "One powerful reveal of the look",
    Icon: Sparkles,
    fields: [
      { id: "style", label: "Reveal style", multi: false, opts: ["Slow camera pan upward", "Turn-around reveal", "Walk into frame", "Fabric drop / uncover", "Silhouette to full reveal"] },
      { id: "bg", label: "Backdrop", multi: false, opts: ["Neutral ivory / white", "Dark & moody", "Outdoor golden light", "Luxury interior"] },
      { id: "energy", label: "Model energy", multi: false, opts: ["Composed & editorial", "Confident & commanding", "Soft & dreamy", "Fierce & powerful"] },
      { id: "end", label: "Ending shot", multi: false, opts: ["Hold on full look", "Slow walk away", "Fabric detail close-up", "Direct look to camera"] },
    ],
    build: (o) =>
      `Luxury outfit reveal video. A striking female model wearing ${LOOK}. Reveal: ${one(o, "style", "slow camera pan upward").toLowerCase()}. Backdrop: ${one(o, "bg", "neutral ivory").toLowerCase()} with soft controlled lighting. Model energy: ${one(o, "energy", "composed & editorial").toLowerCase()}. Video builds anticipation — slow, deliberate — emphasising silhouette, fit, and fabric quality throughout. Ending: ${one(o, "end", "hold on full look").toLowerCase()}. Smooth camera movement only, zero fast cuts. The garment commands every frame. Ultra-realistic 4K.`,
  },
  {
    id: "slowliving",
    label: "Slow living",
    sub: "Atmospheric B-roll · no script",
    note: "The look lives naturally in a beautiful scene",
    Icon: Leaf,
    fields: [
      { id: "setting", label: "Setting", multi: false, opts: ["Morning apartment / home", "Café / patisserie", "Garden / terrace", "Bookshop / gallery", "Coastal / nature", "Hotel room morning"] },
      { id: "activity", label: "Activities", multi: true, opts: ["Morning coffee ritual", "Reading / journaling", "Walking slowly", "Arranging flowers", "Looking out window", "Hands on fabric"] },
      { id: "light", label: "Lighting", multi: false, opts: ["Soft morning window light", "Golden hour", "Overcast diffused", "Warm candlelit"] },
      { id: "pace", label: "Pacing", multi: false, opts: ["Extremely slow & meditative", "Slow & dreamy", "Unhurried & calm"] },
    ],
    build: (o) =>
      `Slow living aesthetic fashion video. A serene, naturally beautiful female model wearing ${LOOK} in a ${one(o, "setting", "morning apartment").toLowerCase()}. Activities: ${many(o, "activity", "morning coffee ritual, looking out window")}. Lighting: ${one(o, "light", "soft morning window light").toLowerCase()}. Pacing: ${one(o, "pace", "slow & dreamy").toLowerCase()} — this is atmosphere, not content. Camera: gentle drifting movement, extreme close-ups on fabric texture, hands, and quiet detail. No posing, no performance — the garment lives naturally in the scene. Cinematic 4K. Quiet, beautiful, worth stopping for.`,
  },
  {
    id: "streetstyle",
    label: "Street style",
    sub: "City walk · editorial outdoor",
    note: "Model in the look, walking a real city",
    Icon: MapPin,
    fields: [
      { id: "loc", label: "Location", multi: false, opts: ["European cobblestone", "Modern glass city", "Luxury shopping district", "Minimalist architecture", "Coastal promenade"] },
      { id: "time", label: "Time of day", multi: false, opts: ["Golden hour", "Bright midday", "Overcast editorial", "Blue hour / dusk"] },
      { id: "movement", label: "Movement", multi: true, opts: ["Walking toward camera", "Walking away", "Crossing street", "Pausing / looking off-frame", "Entering a building"] },
      { id: "style", label: "Edit style", multi: false, opts: ["Candid & natural", "Polished editorial", "Fashion week walk", "Paparazzi-style"] },
    ],
    build: (o) =>
      `Street style luxury fashion video. An effortlessly stylish female model wearing ${LOOK} on ${one(o, "loc", "European cobblestone streets").toLowerCase()} during ${one(o, "time", "golden hour").toLowerCase()}. Edit style: ${one(o, "style", "polished editorial").toLowerCase()}. Movement: ${many(o, "movement", "walking toward camera, pausing / looking off-frame")}. Camera follows naturally — wide establishing, mid-body tracking, spontaneous detail shots. Shallow depth of field blurs environment softly. Natural ambient light throughout. The outfit always clearly visible, perfectly styled. Cinematic 4K. No rigs visible. Authentic luxury street presence.`,
  },
  {
    id: "fashionweek",
    label: "Fashion week moment",
    sub: "Front row · event · street energy",
    note: "The look in a fashion week context",
    Icon: Building2,
    fields: [
      { id: "city", label: "City", multi: false, opts: ["Paris", "Milan", "London", "New York", "Copenhagen"] },
      { id: "context", label: "Scene", multi: false, opts: ["Front row arrival", "Street style walk outside venue", "Show exit crowd moment", "Hotel lobby departure", "Showroom / preview visit"] },
      { id: "outfit", label: "Outfit energy", multi: false, opts: ["Quiet luxury statement", "Bold maximalist", "European minimal", "All-black power look"] },
      { id: "cam", label: "Camera style", multi: false, opts: ["Candid documentary", "Polished editorial", "Slow cinematic", "Paparazzi-style"] },
    ],
    build: (o) =>
      `Fashion week luxury video set in ${one(o, "city", "Paris")}. A fashion-forward, elegantly dressed female model wearing ${LOOK}, outfit energy: ${one(o, "outfit", "quiet luxury statement").toLowerCase()}. Scene: ${one(o, "context", "front row arrival").toLowerCase()}. Camera style: ${one(o, "cam", "polished editorial").toLowerCase()}. Ambient city energy — architecture, blurred crowd, soft movement. Model navigates the environment with total ease and composure. Mix of wide establishing, mid-body movement, and close detail on outfit and accessories. Natural ambient light. Cinematic 4K. Fashion week energy — controlled, aspirational, editorial.`,
  },
  {
    id: "grwm",
    label: "GRWM",
    sub: "Get ready · personal & real",
    note: "Styling the look in a getting-ready moment",
    Icon: Wand2,
    fields: [
      { id: "occasion", label: "Occasion", multi: false, opts: ["Luxury dinner", "Office / workday", "Weekend brunch", "Gala / event", "Casual luxury day"] },
      { id: "loc", label: "Setting", multi: false, opts: ["Luxury dressing room", "Hotel suite", "Minimalist vanity", "Bright airy studio"] },
      { id: "mood", label: "Mood", multi: false, opts: ["Calm & aspirational", "Confident & powerful", "Soft & feminine", "Cool & editorial"] },
      { id: "beats", label: "Key moments", multi: true, opts: ["Trying on", "Mirror check", "Jewellery close-up", "Final look walk-away", "Perfume finishing touch"] },
    ],
    build: (o) =>
      `GRWM luxury fashion video for ${one(o, "occasion", "a luxury event").toLowerCase()}. A stylish refined female model in a ${one(o, "loc", "luxury dressing room").toLowerCase()} styling ${LOOK}. Mood: ${one(o, "mood", "calm & aspirational").toLowerCase()}. Natural sequence: ${many(o, "beats", "trying on, mirror check, final look walk-away")}. Camera: handheld-steady, intimate close-ups on fabric texture, hands, mirror reflections. Warm personal lighting. Movement feels natural and unhurried. Final shot: confident full-length mirror look. Cinematic quality — personal yet aspirational.`,
  },
];

export function getFilmFormat(id: string | null) {
  return FILM_FORMATS.find((f) => f.id === id);
}

/**
 * Build the final influencer-film prompt: preserve the subject + outfit from the
 * reference image, then the format prose, then any free-text direction.
 */
export function buildFilmPrompt(
  formatId: string | null,
  opts: FilmOpts,
  productName?: string,
  extraText?: string,
): string {
  const fmt = getFilmFormat(formatId);
  if (!fmt) return extraText?.trim() || "";
  const lead =
    "Animate the subject from the reference image, preserving their face and the exact outfit" +
    (productName ? ` (${productName})` : "") +
    ". ";
  const extra = extraText?.trim() ? ` ${extraText.trim()}` : "";
  return lead + fmt.build(opts) + extra;
}
