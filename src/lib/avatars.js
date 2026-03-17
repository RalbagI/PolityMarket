/**
 * Avatar mapping from politician ID/name to image path.
 * Images are stored in public/assets/avatars/ as .webp files.
 *
 * To generate cartoon avatars for new politicians:
 * 1. Source a clear reference photo of the politician
 * 2. Use an AI image tool (DALL-E, Midjourney, Stable Diffusion) with prompt:
 *    "Cartoon-style portrait icon of [Name], colorful, friendly, circular crop,
 *     white background, suitable for a web dashboard avatar"
 * 3. Crop to square, resize to 200x200px
 * 4. Convert to .webp: `cwebp -q 80 input.png -o output.webp`
 * 5. Save to public/assets/avatars/{politician-id}.webp
 * 6. Add the mapping below
 */

const AVATAR_MAP = {
  "benjamin-netanyahu": "/assets/avatars/benjamin-netanyahu.webp",
  "yair-lapid": "/assets/avatars/yair-lapid.webp",
  "benny-gantz": "/assets/avatars/benny-gantz.webp",
  "bezalel-smotrich": "/assets/avatars/bezalel-smotrich.webp",
  "avigdor-lieberman": "/assets/avatars/avigdor-lieberman.webp",
};

// Color palette for initial-based fallbacks (deterministic per name)
const FALLBACK_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
  "#3b82f6",
];

export function getAvatarUrl(politicianId) {
  return AVATAR_MAP[politicianId] || null;
}

export function getAvatarIdFromName(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function getFallbackColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
