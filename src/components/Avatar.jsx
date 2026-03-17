import { useState } from "react";
import { getAvatarUrl, getAvatarIdFromName, getFallbackColor, getInitials } from "../lib/avatars";

export default function Avatar({ name, politicianId, size = 40, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const id = politicianId || getAvatarIdFromName(name);
  const url = getAvatarUrl(id);
  const fallbackColor = getFallbackColor(name);
  const initials = getInitials(name);

  const sizeClass =
    {
      32: "w-8 h-8 text-xs",
      40: "w-10 h-10 text-sm",
      48: "w-12 h-12 text-base",
      64: "w-16 h-16 text-lg",
    }[size] || "w-10 h-10 text-sm";

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
        loading="lazy"
        width={size}
        height={size}
      />
    );
  }

  // Fallback: colored circle with initials
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white ${sizeClass} ${className}`}
      style={{ backgroundColor: fallbackColor }}
      title={name}
    >
      {initials}
    </div>
  );
}
