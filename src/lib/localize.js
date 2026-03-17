/**
 * Localize politician and party names using i18n translation keys.
 * Falls back to the original English name if no translation exists.
 */
export function localizeName(t, name) {
  const key = `politicians.${name}`;
  const translated = t(key, { defaultValue: "" });
  return translated || name;
}

export function localizeParty(t, party) {
  const key = `parties.${party}`;
  const translated = t(key, { defaultValue: "" });
  return translated || party;
}
