/**
 * Shared persona avatar map — single source of truth for all local avatar images.
 * Always returns a local require() reference; never falls back to remote URLs.
 */

const DEFAULT_AVATAR = require('../assets/images-1.jpg');

const LOCAL_AVATARS: Record<string, number> = {
  // =========================================================================
  // CHALLENGERS
  // =========================================================================
  'sarah mitchell': require('../assets/women/sarah-mitchell.jpg'),
  'marcus webb challenger': require('../assets/men/marcus-webb.jpg'),
  'cormac brennan': require('../assets/men/cormac-brennan.jpg'),
  'dr. raj patel': require('../assets/men/raj-patel.jpg'),
  'raj patel': require('../assets/men/raj-patel.jpg'),
  'henry tanaka': require('../assets/men/henry-tanaka.jpg'),
  'professor elena volkov': require('../assets/women/elena-volkov.jpg'),
  'elena volkov': require('../assets/women/elena-volkov.jpg'),
  'dr. maya chen': require('../assets/women/maya-chen.jpg'),
  'maya chen': require('../assets/women/maya-chen.jpg'),
  'yuki tanaka': require('../assets/women/yuki-tanaka.jpg'),
  'alexandra reed': require('../assets/women/alexandra-reed.jpg'),
  'sienna donovan': require('../assets/women/sienna-donovan.jpg'),
  'zara khoury': require('../assets/women/zara-khoury.jpg'),
  'bridget murphy': require('../assets/women/bridget-murphy.jpg'),
  'tessa grant': require('../assets/women/tessa-grant.jpg'),
  'fiona gallagher': require('../assets/women/fiona-gallagher.jpg'),
  'elena petrova': require('../assets/women/elena-petrova.jpg'),
  'lucas brandt': require('../assets/men/lucas-brandt.jpg'),

  // =========================================================================
  // DATING COACHES
  // =========================================================================
  'alex rivera': require('../assets/men/alex-rivera.jpg'),
  'jordan chen': require('../assets/men/jordan-chen.jpg'),
  'sam taylor': require('../assets/men/sam-taylor.jpg'),
  'dr. maya jensen': require('../assets/women/maya-jensen.jpg'),
  'maya jensen': require('../assets/women/maya-jensen.jpg'),
  'marcus webb': require('../assets/men/marcus-webb-dating.jpg'),
  'mia chang': require('../assets/women/mia-chang.jpg'),
  'chris martinez': require('../assets/men/chris-martinez.jpg'),
  'dr. sarah bennett': require('../assets/women/sarah-bennett.jpg'),
  'sarah bennett': require('../assets/women/sarah-bennett.jpg'),
  'rachel stevens': require('../assets/women/rachel-stevens.jpg'),
  'diana novak': require('../assets/women/diana-novak.jpg'),
  'hannah brooks': require('../assets/women/hannah-brooks.jpg'),
  'adaeze obi': require('../assets/women/adaeze-obi.jpg'),
  'jake sullivan': require('../assets/men/jake-sullivan.jpg'),
  'daniel hart': require('../assets/men/daniel-hart.jpg'),

  // =========================================================================
  // INTERVIEW COACHES
  // =========================================================================
  'michael santos': require('../assets/men/michael-santos.jpg'),
  'erin calloway': require('../assets/women/erin-calloway.jpg'),
  'david park': require('../assets/men/david-park.jpg'),
  'grace williams': require('../assets/women/grace-williams.jpg'),
  'natasha volkov': require('../assets/women/natasha-volkov.jpg'),
  'carmen delgado': require('../assets/women/carmen-delgado.jpg'),
  'jessica taylor': require('../assets/women/jessica-taylor.jpg'),
  'darnell washington': require('../assets/men/darnell-washington.jpg'),
  'jason wu': require('../assets/men/jason-wu.jpg'),

  // =========================================================================
  // PRESENTATION COACHES
  // =========================================================================
  'james morrison': require('../assets/men/james-morrison.jpg'),
  'aisha rahman': require('../assets/women/aisha-rahman.jpg'),
  'lisa moretti': require('../assets/women/lisa-moretti.jpg'),
  'claire dubois': require('../assets/women/claire-dubois.jpg'),
  'margaret brennan': require('../assets/women/margaret-brennan.jpg'),
  'nils eriksson': require('../assets/men/nils-eriksson.jpg'),

  // =========================================================================
  // NEGOTIATION COACHES
  // =========================================================================
  'victor reyes': require('../assets/men/victor-reyes.jpg'),
  'catherine walsh': require('../assets/women/catherine-walsh.jpg'),
  'omar hassan': require('../assets/men/omar-hassan.jpg'),
  'elsa bergstrom': require('../assets/women/elsa-bergstrom.jpg'),
  'astrid nielsen': require('../assets/women/astrid-nielsen.jpg'),
  'kenji watanabe': require('../assets/men/kenji-watanabe.jpg'),
  'patrick doyle': require('../assets/men/patrick-doyle.jpg'),

  // =========================================================================
  // DIFFICULT CONVERSATIONS COACHES
  // =========================================================================
  'dr. nina larsson': require('../assets/women/nina-larsson.jpg'),
  'nina larsson': require('../assets/women/nina-larsson.jpg'),
  'marcus johnson': require('../assets/men/marcus-johnson.jpg'),
  'emma larsson': require('../assets/women/emma-larsson.jpg'),
  'ingrid svensson': require('../assets/women/ingrid-svensson.jpg'),
  'kelly anderson': require('../assets/women/kelly-anderson.jpg'),
  'ryan callahan': require('../assets/men/ryan-callahan.jpg'),
  'jiro tanaka': require('../assets/men/jiro-tanaka.jpg'),

  // =========================================================================
  // NETWORKING COACHES
  // =========================================================================
  'derek thompson': require('../assets/men/derek-thompson.jpg'),
  'karin lindberg': require('../assets/women/karin-lindberg.jpg'),
  'sophia adeyemi': require('../assets/women/sophia-adeyemi.jpg'),
  'eva lindqvist': require('../assets/women/eva-lindqvist.jpg'),
  'amara diallo': require('../assets/women/amara-diallo.jpg'),
  'erik lindgren': require('../assets/men/erik-lindgren.jpg'),
  'arjun mehta': require('../assets/men/arjun-mehta.jpg'),

  // =========================================================================
  // SALES & PERSUASION COACHES
  // =========================================================================
  'nadia karim': require('../assets/women/nadia-karim.jpg'),
  'andrea flynn': require('../assets/women/andrea-flynn.jpg'),
  'natalie winter': require('../assets/women/natalie-winter.jpg'),
  'connor blake': require('../assets/men/connor-blake.jpg'),
  'charles okafor': require('../assets/men/charles-okafor.jpg'),
  'brett lawson': require('../assets/men/brett-lawson.jpg'),

  // =========================================================================
  // LEADERSHIP & MANAGEMENT COACHES
  // =========================================================================
  'victoria blackwell': require('../assets/women/victoria-blackwell.jpg'),
  'karen whitfield': require('../assets/women/karen-whitfield.jpg'),
  'helen crawford': require('../assets/women/helen-crawford.jpg'),
  'anders bergman': require('../assets/men/anders-bergman.jpg'),
  'hiroshi nakamura': require('../assets/men/hiroshi-nakamura.jpg'),

  // =========================================================================
  // CAREER TRANSITIONS COACHES
  // =========================================================================
  'patricia keane': require('../assets/women/patricia-keane.jpg'),
  'julia kovacs': require('../assets/women/julia-kovacs.jpg'),
  'logan pierce': require('../assets/men/logan-pierce.jpg'),
  'grant lawson': require('../assets/men/grant-lawson.jpg'),
};

/** Returns the matched local avatar or null if no match. */
export function getLocalAvatar(name: string): number | null {
  const normalizedName = name.toLowerCase().trim();
  return LOCAL_AVATARS[normalizedName] ?? null;
}

/** Always returns a local require() reference — matched image or default fallback. */
export function resolvePersonaAvatar(name: string): number {
  return getLocalAvatar(name) ?? DEFAULT_AVATAR;
}

/**
 * Returns the best avatar source for a persona.
 * Prefers custom DB URL (generated avatar), falls back to local asset, then default.
 */
export function resolvePersonaAvatarWithUrl(
  name: string,
  avatarUrl?: string | null,
  thumbnailUrl?: string | null,
): number | { uri: string } {
  // Custom generated avatar takes priority over local fallback
  const url = thumbnailUrl || avatarUrl;
  if (url && url !== 'local') return { uri: url };
  const local = getLocalAvatar(name);
  if (local) return local;
  return DEFAULT_AVATAR;
}
