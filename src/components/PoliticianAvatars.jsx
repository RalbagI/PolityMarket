/**
 * Hand-crafted cartoon-style SVG avatars for each politician.
 * Each has distinctive, recognizable features.
 */

function NetanyahuAvatar({ size }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full">
      <circle cx="50" cy="50" r="50" fill="#f5e6d3" />
      {/* Hair - silver/gray, swept back */}
      <ellipse cx="50" cy="28" rx="35" ry="22" fill="#b0b0b0" />
      <ellipse cx="50" cy="24" rx="32" ry="18" fill="#c0c0c0" />
      {/* Face */}
      <ellipse cx="50" cy="52" rx="30" ry="32" fill="#f0d0b4" />
      {/* Eyes */}
      <ellipse cx="38" cy="48" rx="5" ry="4" fill="white" />
      <ellipse cx="62" cy="48" rx="5" ry="4" fill="white" />
      <circle cx="39" cy="48" r="2.5" fill="#3d2b1f" />
      <circle cx="63" cy="48" r="2.5" fill="#3d2b1f" />
      {/* Eyebrows - thick, prominent */}
      <path d="M30 42 Q38 37 46 42" stroke="#555" strokeWidth="2.5" fill="none" />
      <path d="M54 42 Q62 37 70 42" stroke="#555" strokeWidth="2.5" fill="none" />
      {/* Nose */}
      <path d="M48 50 Q50 58 52 50" stroke="#c8a88a" strokeWidth="1.5" fill="none" />
      {/* Mouth - slight smile */}
      <path d="M40 64 Q50 70 60 64" stroke="#c47a6a" strokeWidth="2" fill="none" />
      {/* Chin - strong */}
      <path d="M35 72 Q50 82 65 72" stroke="#e0c0a0" strokeWidth="1" fill="none" />
      {/* Ears */}
      <ellipse cx="20" cy="52" rx="5" ry="7" fill="#f0d0b4" />
      <ellipse cx="80" cy="52" rx="5" ry="7" fill="#f0d0b4" />
      {/* Suit collar */}
      <path d="M25 85 L40 78 L50 85 L60 78 L75 85 L80 100 L20 100 Z" fill="#1a1a2e" />
      <path d="M46 78 L50 85 L54 78" fill="#c0392b" />
    </svg>
  );
}

function LapidAvatar({ size }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full">
      <circle cx="50" cy="50" r="50" fill="#e8ddd0" />
      {/* Hair - dark, styled */}
      <ellipse cx="50" cy="26" rx="33" ry="20" fill="#3a3a3a" />
      <ellipse cx="50" cy="22" rx="30" ry="16" fill="#4a4a4a" />
      <path d="M20 32 Q30 18 50 16 Q70 18 80 32" fill="#3a3a3a" />
      {/* Face - angular */}
      <ellipse cx="50" cy="52" rx="28" ry="30" fill="#f0d0b4" />
      {/* Eyes - sharp */}
      <ellipse cx="38" cy="47" rx="5" ry="3.5" fill="white" />
      <ellipse cx="62" cy="47" rx="5" ry="3.5" fill="white" />
      <circle cx="39" cy="47" r="2.2" fill="#2c5f8a" />
      <circle cx="63" cy="47" r="2.2" fill="#2c5f8a" />
      {/* Eyebrows */}
      <path d="M31 42 Q38 39 45 42" stroke="#3a3a3a" strokeWidth="2" fill="none" />
      <path d="M55 42 Q62 39 69 42" stroke="#3a3a3a" strokeWidth="2" fill="none" />
      {/* Nose */}
      <path d="M48 49 Q50 56 52 49" stroke="#c8a88a" strokeWidth="1.5" fill="none" />
      {/* Mouth - media smile */}
      <path d="M40 62 Q50 68 60 62" stroke="#c47a6a" strokeWidth="2" fill="#e8a090" />
      {/* Ears */}
      <ellipse cx="22" cy="50" rx="4" ry="6" fill="#f0d0b4" />
      <ellipse cx="78" cy="50" rx="4" ry="6" fill="#f0d0b4" />
      {/* Glasses - thin frame */}
      <circle cx="38" cy="47" r="8" stroke="#555" strokeWidth="1.5" fill="none" />
      <circle cx="62" cy="47" r="8" stroke="#555" strokeWidth="1.5" fill="none" />
      <line x1="46" y1="47" x2="54" y2="47" stroke="#555" strokeWidth="1.5" />
      {/* Suit */}
      <path d="M25 85 L40 78 L50 85 L60 78 L75 85 L80 100 L20 100 Z" fill="#2c3e50" />
      <path d="M46 78 L50 85 L54 78" fill="#2980b9" />
    </svg>
  );
}

function GantzAvatar({ size }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full">
      <circle cx="50" cy="50" r="50" fill="#ddd5c8" />
      {/* Hair - short, military cut, graying */}
      <ellipse cx="50" cy="28" rx="32" ry="18" fill="#777" />
      <rect x="20" y="28" width="60" height="8" rx="3" fill="#777" />
      {/* Face - square, strong jaw */}
      <rect x="24" y="32" width="52" height="50" rx="18" fill="#e8c8a8" />
      {/* Eyes - steady */}
      <ellipse cx="38" cy="48" rx="5" ry="4" fill="white" />
      <ellipse cx="62" cy="48" rx="5" ry="4" fill="white" />
      <circle cx="39" cy="48" r="2.5" fill="#4a6741" />
      <circle cx="63" cy="48" r="2.5" fill="#4a6741" />
      {/* Eyebrows - straight, military */}
      <line x1="30" y1="42" x2="46" y2="42" stroke="#666" strokeWidth="2.5" />
      <line x1="54" y1="42" x2="70" y2="42" stroke="#666" strokeWidth="2.5" />
      {/* Nose */}
      <path d="M48 50 Q50 58 52 50" stroke="#c8a88a" strokeWidth="1.5" fill="none" />
      {/* Mouth - firm */}
      <line x1="40" y1="65" x2="60" y2="65" stroke="#b07060" strokeWidth="2" />
      {/* Ears */}
      <ellipse cx="22" cy="50" rx="5" ry="7" fill="#e8c8a8" />
      <ellipse cx="78" cy="50" rx="5" ry="7" fill="#e8c8a8" />
      {/* Suit */}
      <path d="M22 85 L40 78 L50 85 L60 78 L78 85 L82 100 L18 100 Z" fill="#1a1a2e" />
      <path d="M46 78 L50 85 L54 78" fill="#8e44ad" />
    </svg>
  );
}

function SmotrichAvatar({ size }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full">
      <circle cx="50" cy="50" r="50" fill="#e8ddd0" />
      {/* Kippah */}
      <ellipse cx="50" cy="22" rx="22" ry="12" fill="#1a1a2e" />
      {/* Hair - dark, sides */}
      <rect x="18" y="28" width="14" height="20" rx="5" fill="#2c2c2c" />
      <rect x="68" y="28" width="14" height="20" rx="5" fill="#2c2c2c" />
      {/* Face */}
      <ellipse cx="50" cy="50" rx="28" ry="30" fill="#f0d0b4" />
      {/* Eyes */}
      <ellipse cx="38" cy="46" rx="5" ry="3.5" fill="white" />
      <ellipse cx="62" cy="46" rx="5" ry="3.5" fill="white" />
      <circle cx="39" cy="46" r="2.2" fill="#3d2b1f" />
      <circle cx="63" cy="46" r="2.2" fill="#3d2b1f" />
      {/* Glasses - rectangular */}
      <rect x="29" y="41" width="18" height="12" rx="2" stroke="#333" strokeWidth="1.5" fill="none" />
      <rect x="53" y="41" width="18" height="12" rx="2" stroke="#333" strokeWidth="1.5" fill="none" />
      <line x1="47" y1="47" x2="53" y2="47" stroke="#333" strokeWidth="1.5" />
      {/* Eyebrows */}
      <path d="M30 39 Q38 35 46 39" stroke="#2c2c2c" strokeWidth="2" fill="none" />
      <path d="M54 39 Q62 35 70 39" stroke="#2c2c2c" strokeWidth="2" fill="none" />
      {/* Nose */}
      <path d="M48 48 Q50 56 52 48" stroke="#c8a88a" strokeWidth="1.5" fill="none" />
      {/* Beard - full */}
      <path d="M28 58 Q30 75 50 80 Q70 75 72 58" fill="#2c2c2c" />
      <path d="M32 60 Q34 72 50 76 Q66 72 68 60" fill="#3a3a3a" />
      {/* Mouth in beard */}
      <path d="M42 64 Q50 68 58 64" stroke="#c47a6a" strokeWidth="1.5" fill="none" />
      {/* Ears */}
      <ellipse cx="22" cy="48" rx="4" ry="6" fill="#f0d0b4" />
      <ellipse cx="78" cy="48" rx="4" ry="6" fill="#f0d0b4" />
      {/* Suit - white shirt */}
      <path d="M25 85 L40 78 L50 85 L60 78 L75 85 L80 100 L20 100 Z" fill="white" />
      <path d="M46 78 L50 85 L54 78" fill="#1a1a2e" />
    </svg>
  );
}

function LiebermanAvatar({ size }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full">
      <circle cx="50" cy="50" r="50" fill="#ddd5c8" />
      {/* Hair - receding, dark */}
      <path d="M22 35 Q30 18 50 16 Q70 18 78 35" fill="#4a3a2a" />
      <ellipse cx="50" cy="24" rx="28" ry="14" fill="#4a3a2a" />
      {/* Face - round, heavy */}
      <ellipse cx="50" cy="52" rx="32" ry="34" fill="#f0d0b4" />
      {/* Eyes - small */}
      <ellipse cx="38" cy="48" rx="4" ry="3" fill="white" />
      <ellipse cx="62" cy="48" rx="4" ry="3" fill="white" />
      <circle cx="39" cy="48" r="2" fill="#3d2b1f" />
      <circle cx="63" cy="48" r="2" fill="#3d2b1f" />
      {/* Eyebrows - thick */}
      <path d="M30 43 Q38 39 46 43" stroke="#4a3a2a" strokeWidth="2.5" fill="none" />
      <path d="M54 43 Q62 39 70 43" stroke="#4a3a2a" strokeWidth="2.5" fill="none" />
      {/* Nose - prominent */}
      <path d="M47 50 Q50 60 53 50" stroke="#c8a88a" strokeWidth="2" fill="#e8c0a0" />
      {/* Mustache - trademark */}
      <path d="M36 62 Q42 58 50 60 Q58 58 64 62" fill="#4a3a2a" />
      <path d="M38 63 Q44 60 50 61 Q56 60 62 63" fill="#5a4a3a" />
      {/* Mouth */}
      <path d="M42 66 Q50 70 58 66" stroke="#b07060" strokeWidth="1.5" fill="none" />
      {/* Double chin */}
      <path d="M35 76 Q50 84 65 76" stroke="#e0c0a0" strokeWidth="1.5" fill="none" />
      {/* Ears */}
      <ellipse cx="18" cy="52" rx="5" ry="7" fill="#f0d0b4" />
      <ellipse cx="82" cy="52" rx="5" ry="7" fill="#f0d0b4" />
      {/* Suit */}
      <path d="M22 88 L38 80 L50 88 L62 80 L78 88 L82 100 L18 100 Z" fill="#1a1a2e" />
      <path d="M46 80 L50 88 L54 80" fill="#c0392b" />
    </svg>
  );
}

const AVATAR_COMPONENTS = {
  "benjamin-netanyahu": NetanyahuAvatar,
  "yair-lapid": LapidAvatar,
  "benny-gantz": GantzAvatar,
  "bezalel-smotrich": SmotrichAvatar,
  "avigdor-lieberman": LiebermanAvatar,
};

export default function PoliticianAvatar({ politicianId, name, size = 40 }) {
  const id = politicianId || name?.toLowerCase().replace(/\s+/g, "-");
  const AvatarComponent = AVATAR_COMPONENTS[id];

  if (AvatarComponent) {
    return <AvatarComponent size={size} />;
  }

  // Generic fallback for unknown politicians
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#f43f5e", "#f59e0b"];
  const bg = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
