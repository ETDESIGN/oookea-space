"use client";

/**
 * Studio illustrations — bespoke SVG line-art moments in the brand style.
 * The "O" character in human situations for empty states.
 */

export function EmptyState({ variant, title, body }: {
  variant: "activity" | "projects" | "messages" | "files" | "generic" | "404";
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <StudioIllustration variant={variant} />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export function StudioIllustration({ variant }: { variant: string }) {
  const stroke = "currentColor";
  const common = {
    width: 120,
    height: 96,
    viewBox: "0 0 120 96",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: "text-muted-foreground/50",
  };

  switch (variant) {
    case "activity":
      return (
        <svg {...common}>
          {/* O on a deadline calendar, pencil in hand */}
          <rect x="20" y="28" width="64" height="52" rx="8" stroke={stroke} strokeWidth="2.5" />
          <line x1="20" y1="44" x2="84" y2="44" stroke={stroke} strokeWidth="2.5" />
          <line x1="36" y1="22" x2="36" y2="34" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="68" y1="22" x2="68" y2="34" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="46" cy="62" r="9" stroke={stroke} strokeWidth="3" />
          <line x1="56" y1="62" x2="72" y2="62" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" />
          <line x1="96" y1="30" x2="104" y2="22" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M96 30 L 88 38 L 90 40 L 98 32 Z" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          {/* O watering a sprouting plant */}
          <circle cx="42" cy="38" r="12" stroke={stroke} strokeWidth="3" />
          <path d="M54 52 C 58 60, 66 62, 72 58" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M78 66 L 78 84" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M78 72 C 70 72, 66 66, 66 60 C 74 60, 78 64, 78 72 Z" stroke={stroke} strokeWidth="2" />
          <path d="M78 76 C 86 76, 90 70, 90 64 C 82 64, 78 68, 78 76 Z" stroke={stroke} strokeWidth="2" />
          <circle cx="96" cy="52" r="1.8" fill={stroke} />
          <circle cx="24" cy="60" r="1.4" fill={stroke} />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          {/* O with a speech bubble, mid-thought */}
          <circle cx="40" cy="40" r="13" stroke={stroke} strokeWidth="3" />
          <path d="M58 26 h 32 a 6 6 0 0 1 6 6 v 14 a 6 6 0 0 1 -6 6 h -18 l -8 8 v -8 h -6 a 6 6 0 0 1 -6 -6 v -14 a 6 6 0 0 1 6 -6 Z" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="72" cy="39" r="1.6" fill={stroke} />
          <circle cx="80" cy="39" r="1.6" fill={stroke} />
          <circle cx="88" cy="39" r="1.6" fill={stroke} />
        </svg>
      );
    case "files":
      return (
        <svg {...common}>
          {/* O as a folder archivist */}
          <path d="M24 32 h 22 l 6 8 h 42 a 4 4 0 0 1 4 4 v 30 a 4 4 0 0 1 -4 4 h -70 a 4 4 0 0 1 -4 -4 v -38 a 4 4 0 0 1 4 -4 Z" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="52" cy="58" r="10" stroke={stroke} strokeWidth="3" />
          <line x1="62" y1="58" x2="76" y2="58" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4" />
        </svg>
      );
    case "404":
      return (
        <svg {...common}>
          {/* O as a magnifying glass, searching */}
          <circle cx="50" cy="44" r="16" stroke={stroke} strokeWidth="3" />
          <line x1="61" y1="55" x2="78" y2="72" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M44 40 a 6 6 0 0 1 6 -4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="26" x2="30" y2="30" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="96" y1="20" x2="92" y2="24" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="60" cy="48" r="18" stroke={stroke} strokeWidth="3" />
          <path d="M52 48 a 8 8 0 0 1 16 0" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="24" y1="28" x2="28" y2="32" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="94" y1="70" x2="90" y2="66" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

/** Branded skeleton loader — the pulsing O. Replaces bare spinners in hero positions. */
export function BrandLoader({ size = 40 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div
        className="animate-brand-pulse flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-[0_0_30px_-4px_rgba(99,102,241,0.6)]"
        style={{ width: size, height: size }}
      >
        <span className="font-black text-white" style={{ fontSize: size * 0.5 }}>
          O
        </span>
      </div>
    </div>
  );
}
