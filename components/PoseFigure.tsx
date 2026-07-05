import { type IdentityKind } from "@/lib/auth/client";

/**
 * Minimal line-art pose placeholders that show what to upload in each photo
 * slot (full length, face close-up, left/right profile, back). Editorial,
 * single-stroke, inherits colour via currentColor. Shared by onboarding +
 * the profile photo slots. Not a real image.
 */
export default function PoseFigure({
  kind,
  className = "uc-fig",
}: {
  kind: IdentityKind;
  className?: string;
}) {
  const svg = {
    viewBox: "0 0 64 80",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  switch (kind) {
    case "body": // full length - standing figure
      return (
        <svg {...svg}>
          <circle cx="32" cy="12" r="7" />
          <path d="M32 19v26" />
          <path d="M32 25 19 37M32 25l13 12" />
          <path d="M32 45 23 74M32 45l9 29" />
        </svg>
      );
    case "selfie": // face close-up - head & shoulders
      return (
        <svg {...svg}>
          <circle cx="32" cy="26" r="13" />
          <path d="M12 73c0-12 9-19 20-19s20 7 20 19" />
        </svg>
      );
    case "left": // left profile - face cue on the left
      return (
        <svg {...svg}>
          <circle cx="32" cy="26" r="13" />
          <path d="M19 20l-5 6 5 6" />
          <path d="M12 73c0-12 9-19 20-19s20 7 20 19" />
        </svg>
      );
    case "right": // right profile - face cue on the right
      return (
        <svg {...svg}>
          <circle cx="32" cy="26" r="13" />
          <path d="M45 20l5 6-5 6" />
          <path d="M12 73c0-12 9-19 20-19s20 7 20 19" />
        </svg>
      );
    case "back": // from behind - crown/part line, no face
      return (
        <svg {...svg}>
          <circle cx="32" cy="26" r="13" />
          <path d="M32 15v9" />
          <path d="M12 73c0-12 9-19 20-19s20 7 20 19" />
        </svg>
      );
    default:
      return null;
  }
}
