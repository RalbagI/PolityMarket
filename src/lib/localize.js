/**
 * Localize politician and party names using i18n translation keys.
 * Falls back to the original English name if no translation exists.
 * Accesses the politicians/parties objects via t() with the name
 * passed as interpolation to avoid key separator issues with dots.
 */
export function localizeName(t, name) {
  return t(`politicians.${name}`, { defaultValue: name });
}

export function localizeParty(t, party) {
  return t(`parties.${party}`, { defaultValue: party });
}
