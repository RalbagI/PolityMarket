/**
 * Parametric SVG avatar generator for Israeli politicians.
 * Each politician gets a unique combination of traits:
 * - skin tone, face shape, hair style/color, eyes, glasses, beard,
 *   kippah, hijab, suit color, tie color, distinguishing features
 *
 * Keeps the 5 original hand-crafted avatars for the most prominent
 * politicians, generates the rest from trait configs.
 */

// ── Trait Rendering Functions ─────────────────────────────────────────

function renderHair(style, color, gray) {
  const c = gray ? mixColor(color, "#b0b0b0", 0.6) : color;
  switch (style) {
    case "swept":
      return (
        <>
          <ellipse cx="50" cy="28" rx="35" ry="22" fill={c} />
          <ellipse cx="50" cy="24" rx="32" ry="18" fill={lighten(c)} />
        </>
      );
    case "short":
      return (
        <>
          <ellipse cx="50" cy="28" rx="32" ry="18" fill={c} />
          <rect x="20" y="28" width="60" height="8" rx="3" fill={c} />
        </>
      );
    case "curly":
      return (
        <>
          <ellipse cx="50" cy="26" rx="34" ry="20" fill={c} />
          <circle cx="25" cy="32" r="8" fill={c} />
          <circle cx="75" cy="32" r="8" fill={c} />
          <circle cx="35" cy="20" r="7" fill={lighten(c)} />
          <circle cx="65" cy="20" r="7" fill={lighten(c)} />
        </>
      );
    case "receding":
      return (
        <>
          <path d="M22 35 Q30 18 50 16 Q70 18 78 35" fill={c} />
          <ellipse cx="50" cy="24" rx="28" ry="14" fill={c} />
        </>
      );
    case "bald":
      return <ellipse cx="50" cy="30" rx="30" ry="12" fill="#e8d0b8" opacity="0.3" />;
    case "long":
      return (
        <>
          <ellipse cx="50" cy="26" rx="36" ry="22" fill={c} />
          <rect x="16" y="30" width="14" height="30" rx="7" fill={c} />
          <rect x="70" y="30" width="14" height="30" rx="7" fill={c} />
        </>
      );
    case "styled":
      return (
        <>
          <ellipse cx="50" cy="26" rx="33" ry="20" fill={c} />
          <path d="M20 32 Q30 18 50 16 Q70 18 80 32" fill={c} />
        </>
      );
    case "side-part":
      return (
        <>
          <ellipse cx="50" cy="26" rx="33" ry="20" fill={c} />
          <path d="M22 30 Q25 18 45 16 L45 26 Z" fill={lighten(c)} />
        </>
      );
    default:
      return <ellipse cx="50" cy="28" rx="32" ry="18" fill={c} />;
  }
}

function renderFace(shape, skin) {
  switch (shape) {
    case "round":
      return <ellipse cx="50" cy="52" rx="30" ry="32" fill={skin} />;
    case "square":
      return <rect x="24" y="32" width="52" height="50" rx="18" fill={skin} />;
    case "oval":
      return <ellipse cx="50" cy="52" rx="28" ry="34" fill={skin} />;
    case "long":
      return <ellipse cx="50" cy="54" rx="26" ry="36" fill={skin} />;
    default:
      return <ellipse cx="50" cy="52" rx="29" ry="32" fill={skin} />;
  }
}

function renderEyes(color) {
  return (
    <>
      <ellipse cx="38" cy="48" rx="5" ry="4" fill="white" />
      <ellipse cx="62" cy="48" rx="5" ry="4" fill="white" />
      <circle cx="39" cy="48" r="2.5" fill={color} />
      <circle cx="63" cy="48" r="2.5" fill={color} />
    </>
  );
}

function renderGlasses(style) {
  if (!style) return null;
  switch (style) {
    case "round":
      return (
        <>
          <circle cx="38" cy="47" r="8" stroke="#555" strokeWidth="1.5" fill="none" />
          <circle cx="62" cy="47" r="8" stroke="#555" strokeWidth="1.5" fill="none" />
          <line x1="46" y1="47" x2="54" y2="47" stroke="#555" strokeWidth="1.5" />
        </>
      );
    case "rectangular":
      return (
        <>
          <rect
            x="29"
            y="41"
            width="18"
            height="12"
            rx="2"
            stroke="#333"
            strokeWidth="1.5"
            fill="none"
          />
          <rect
            x="53"
            y="41"
            width="18"
            height="12"
            rx="2"
            stroke="#333"
            strokeWidth="1.5"
            fill="none"
          />
          <line x1="47" y1="47" x2="53" y2="47" stroke="#333" strokeWidth="1.5" />
        </>
      );
    case "thin":
      return (
        <>
          <ellipse cx="38" cy="47" rx="9" ry="6" stroke="#888" strokeWidth="1" fill="none" />
          <ellipse cx="62" cy="47" rx="9" ry="6" stroke="#888" strokeWidth="1" fill="none" />
          <line x1="47" y1="47" x2="53" y2="47" stroke="#888" strokeWidth="1" />
        </>
      );
    default:
      return null;
  }
}

function renderBeard(style, color) {
  if (!style) return null;
  switch (style) {
    case "full":
      return (
        <>
          <path d="M28 58 Q30 75 50 80 Q70 75 72 58" fill={color} />
          <path d="M32 60 Q34 72 50 76 Q66 72 68 60" fill={lighten(color)} />
        </>
      );
    case "goatee":
      return <ellipse cx="50" cy="72" rx="10" ry="8" fill={color} />;
    case "stubble":
      return <ellipse cx="50" cy="68" rx="20" ry="14" fill={color} opacity="0.3" />;
    case "mustache":
      return (
        <>
          <path d="M36 62 Q42 58 50 60 Q58 58 64 62" fill={color} />
          <path d="M38 63 Q44 60 50 61 Q56 60 62 63" fill={lighten(color)} />
        </>
      );
    default:
      return null;
  }
}

function renderHeadCovering(type) {
  if (!type) return null;
  switch (type) {
    case "kippah":
      return <ellipse cx="50" cy="22" rx="22" ry="12" fill="#1a1a2e" />;
    case "kippah-white":
      return <ellipse cx="50" cy="22" rx="22" ry="12" fill="#e8e8e8" />;
    case "kippah-knit":
      return <ellipse cx="50" cy="22" rx="22" ry="12" fill="#c0392b" />;
    case "shtreimel":
      return (
        <>
          <ellipse cx="50" cy="18" rx="30" ry="14" fill="#3a2a1a" />
          <ellipse cx="50" cy="16" rx="28" ry="10" fill="#4a3a2a" />
        </>
      );
    case "hijab":
      return (
        <>
          <ellipse cx="50" cy="30" rx="38" ry="28" fill="#2c3e50" />
          <ellipse cx="50" cy="50" rx="32" ry="35" fill="#34495e" />
        </>
      );
    default:
      return null;
  }
}

function renderSuit(color, tieColor) {
  return (
    <>
      <path d={`M25 85 L40 78 L50 85 L60 78 L75 85 L80 100 L20 100 Z`} fill={color} />
      {tieColor && <path d="M46 78 L50 85 L54 78" fill={tieColor} />}
    </>
  );
}

// ── Color Utilities ───────────────────────────────────────────────────

function lighten(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 0.2;
  return `rgb(${Math.min(255, r + (255 - r) * f)},${Math.min(255, g + (255 - g) * f)},${Math.min(255, b + (255 - b) * f)})`;
}

function mixColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ── Main Generator ────────────────────────────────────────────────────

export default function GeneratedAvatar({ traits, size = 40 }) {
  const {
    skin = "#f0d0b4",
    face = "round",
    hair = "short",
    hairColor = "#3a3a3a",
    grayHair = false,
    eyeColor = "#3d2b1f",
    glasses = null,
    beard = null,
    beardColor = "#3a3a3a",
    headCovering = null,
    suitColor = "#1a1a2e",
    tieColor = "#c0392b",
    bgColor = "#e8ddd0",
    eyebrowThick = false,
  } = traits;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="rounded-full"
      role="img"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="50" fill={bgColor} />
      {headCovering === "hijab"
        ? renderHeadCovering("hijab")
        : renderHair(hair, hairColor, grayHair)}
      {headCovering && headCovering !== "hijab" && renderHeadCovering(headCovering)}
      {renderFace(face, skin)}
      {renderEyes(eyeColor)}
      {/* Eyebrows */}
      <path
        d="M30 42 Q38 37 46 42"
        stroke={grayHair ? "#888" : hairColor}
        strokeWidth={eyebrowThick ? "2.5" : "2"}
        fill="none"
      />
      <path
        d="M54 42 Q62 37 70 42"
        stroke={grayHair ? "#888" : hairColor}
        strokeWidth={eyebrowThick ? "2.5" : "2"}
        fill="none"
      />
      {/* Nose */}
      <path d="M48 50 Q50 58 52 50" stroke="#c8a88a" strokeWidth="1.5" fill="none" />
      {renderGlasses(glasses)}
      {renderBeard(beard, beardColor)}
      {/* Mouth */}
      {!beard || beard === "mustache" ? (
        <path d="M40 64 Q50 70 60 64" stroke="#c47a6a" strokeWidth="2" fill="none" />
      ) : (
        <path d="M42 64 Q50 68 58 64" stroke="#c47a6a" strokeWidth="1.5" fill="none" />
      )}
      {/* Ears */}
      {headCovering !== "hijab" && (
        <>
          <ellipse cx="20" cy="52" rx="5" ry="7" fill={skin} />
          <ellipse cx="80" cy="52" rx="5" ry="7" fill={skin} />
        </>
      )}
      {renderSuit(suitColor, tieColor)}
    </svg>
  );
}
