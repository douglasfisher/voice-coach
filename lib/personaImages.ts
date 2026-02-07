/**
 * Shared persona avatar map — single source of truth for all local avatar images.
 * Always returns a local require() reference; never falls back to remote URLs.
 */

const DEFAULT_AVATAR = require('../assets/images-1.jpg');

const LOCAL_AVATARS: Record<string, any> = {
  // =========================================================================
  // CHALLENGERS (existing)
  // =========================================================================
  'sarah mitchell': require('../assets/women/sarah-mitchell.jpg'),
  'marcus webb challenger': require('../assets/images-2.jpg'),
  "father thomas o'brien": require('../assets/images-3.jpg'),
  'thomas o\'brien': require('../assets/images-3.jpg'),
  'dr. raj patel': require('../assets/images-4.jpg'),
  'raj patel': require('../assets/images-4.jpg'),
  'kofi asante': require('../assets/images-5.jpg'),
  'professor elena volkov': require('../assets/women/elena-volkov.jpg'),
  'elena volkov': require('../assets/women/elena-volkov.jpg'),
  'dr. maya chen': require('../assets/women/maya-chen.jpg'),
  'maya chen': require('../assets/women/maya-chen.jpg'),
  'yuki tanaka': require('../assets/women/yuki-tanaka.jpg'),

  // =========================================================================
  // DATING COACHES
  // =========================================================================
  'alex rivera': require('../assets/coach-alex-rivera.jpg'),
  'jordan chen': require('../assets/coach-jordan-chen.jpg'),
  'sam taylor': require('../assets/coach-sam-taylor.jpg'),
  'dr. maya okonkwo': require('../assets/women/maya-okonkwo.jpg'),
  'maya okonkwo': require('../assets/women/maya-okonkwo.jpg'),
  'marcus webb': require('../assets/coach-marcus-webb.jpg'),
  'mia chang': require('../assets/women/mia-chang.jpg'),
  'chris martinez': require('../assets/coach-chris-martinez.jpg'),
  'dr. sarah kim': require('../assets/women/sarah-kim.jpg'),
  'sarah kim': require('../assets/women/sarah-kim.jpg'),
  // New dating coaches
  'rachel santos': require('../assets/women/rachel-santos.jpg'),
  'diana novak': require('../assets/women/diana-novak.jpg'),
  'hannah brooks': require('../assets/women/hannah-brooks.jpg'),
  'valentina rossi': require('../assets/women/valentina-rossi.jpg'),

  // =========================================================================
  // INTERVIEW COACHES
  // =========================================================================
  'michael santos': require('../assets/coach-michael-santos.jpg'),
  'priya sharma': require('../assets/women/priya-sharma.jpg'),
  'david park': require('../assets/coach-david-park.jpg'),
  'grace williams': require('../assets/women/grace-williams.jpg'),
  // New interview coaches
  'natasha volkov': require('../assets/women/natasha-volkov.jpg'),
  'carmen delgado': require('../assets/women/carmen-delgado.jpg'),
  'jessica taylor': require('../assets/women/jessica-taylor.jpg'),

  // =========================================================================
  // PRESENTATION COACHES
  // =========================================================================
  'james morrison': require('../assets/coach-james-morrison.jpg'),
  'aisha rahman': require('../assets/women/aisha-rahman.jpg'),
  'lisa park': require('../assets/women/lisa-park.jpg'),
  // New presentation coaches
  'claire dubois': require('../assets/women/claire-dubois.jpg'),
  'margaret brennan': require('../assets/women/margaret-brennan.jpg'),

  // =========================================================================
  // NEGOTIATION COACHES
  // =========================================================================
  'victor reyes': require('../assets/coach-victor-reyes.jpg'),
  'catherine walsh': require('../assets/women/catherine-walsh.jpg'),
  'omar hassan': require('../assets/coach-omar-hassan.jpg'),
  // New negotiation coaches
  'layla hassan': require('../assets/women/layla-hassan.jpg'),
  'astrid nielsen': require('../assets/women/astrid-nielsen.jpg'),

  // =========================================================================
  // DIFFICULT CONVERSATIONS COACHES
  // =========================================================================
  'dr. nina patel': require('../assets/women/nina-patel.jpg'),
  'nina patel': require('../assets/women/nina-patel.jpg'),
  'marcus johnson': require('../assets/coach-marcus-johnson.jpg'),
  'emma larsson': require('../assets/women/emma-larsson.jpg'),
  // New difficult conversations coaches
  'ingrid svensson': require('../assets/women/ingrid-svensson.jpg'),
  'kelly anderson': require('../assets/women/kelly-anderson.jpg'),

  // =========================================================================
  // NETWORKING COACHES
  // =========================================================================
  'derek thompson': require('../assets/coach-derek-thompson.jpg'),
  'yuki yamamoto': require('../assets/women/yuki-yamamoto.jpg'),
  'sophia martinez': require('../assets/women/sophia-martinez.jpg'),
  // New networking coaches
  'eva lindqvist': require('../assets/women/eva-lindqvist.jpg'),
  'amara diallo': require('../assets/women/amara-diallo.jpg'),

  // =========================================================================
  // NEW DOMAIN: SALES & PERSUASION COACHES
  // =========================================================================
  'nadia karim': require('../assets/women/nadia-karim.jpg'),
  'andrea moreno': require('../assets/women/andrea-moreno.jpg'),
  'natalie winter': require('../assets/women/natalie-winter.jpg'),

  // =========================================================================
  // NEW DOMAIN: LEADERSHIP & MANAGEMENT COACHES
  // =========================================================================
  'victoria blackwell': require('../assets/women/victoria-blackwell.jpg'),
  'karen whitfield': require('../assets/women/karen-whitfield.jpg'),
  'helen crawford': require('../assets/women/helen-crawford.jpg'),

  // =========================================================================
  // NEW DOMAIN: CAREER TRANSITIONS COACHES
  // =========================================================================
  'patricia keane': require('../assets/women/patricia-keane.jpg'),
  'julia kovacs': require('../assets/women/julia-kovacs.jpg'),

  // =========================================================================
  // NEW CHALLENGERS
  // =========================================================================
  'alexandra reed': require('../assets/women/alexandra-reed.jpg'),
  'sienna donovan': require('../assets/women/sienna-donovan.jpg'),
  'zara okafor': require('../assets/women/zara-okafor.jpg'),
  'bridget murphy': require('../assets/women/bridget-murphy.jpg'),
  'tessa grant': require('../assets/women/tessa-grant.jpg'),

  // =========================================================================
  // NEW CHALLENGER: FIONA GALLAGHER (Irish redhead)
  // NOTE: elena-petrova image used for Elena Petrova challenger
  // =========================================================================
  'fiona gallagher': require('../assets/women/fiona-gallagher.jpg'),
  'elena petrova': require('../assets/women/elena-petrova.jpg'),
};

/** Returns the matched local avatar or null if no match. */
export function getLocalAvatar(name: string): any | null {
  const normalizedName = name.toLowerCase().trim();
  return LOCAL_AVATARS[normalizedName] ?? null;
}

/** Always returns a local require() reference — matched image or default fallback. */
export function resolvePersonaAvatar(name: string): any {
  return getLocalAvatar(name) ?? DEFAULT_AVATAR;
}
