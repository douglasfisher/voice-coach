/**
 * Shared persona avatar map — single source of truth for all local avatar images.
 * Always returns a local require() reference; never falls back to remote URLs.
 */

const DEFAULT_AVATAR = require('../assets/images-1.jpg');

const LOCAL_AVATARS: Record<string, any> = {
  // Original Challengers
  'sarah mitchell': require('../assets/images-1.jpg'),
  'marcus webb challenger': require('../assets/images-2.jpg'),
  "father thomas o'brien": require('../assets/images-3.jpg'),
  'thomas o\'brien': require('../assets/images-3.jpg'),
  'dr. raj patel': require('../assets/images-4.jpg'),
  'raj patel': require('../assets/images-4.jpg'),
  'kofi asante': require('../assets/images-5.jpg'),
  'professor elena volkov': require('../assets/images-7.jpg'),
  'elena volkov': require('../assets/images-7.jpg'),
  'dr. maya chen': require('../assets/images-8.jpg'),
  'maya chen': require('../assets/images-8.jpg'),
  'yuki tanaka': require('../assets/images-8.jpg'),

  // Dating Coaches
  'alex rivera': require('../assets/coach-alex-rivera.jpg'),
  'jordan chen': require('../assets/coach-jordan-chen.jpg'),
  'sam taylor': require('../assets/coach-sam-taylor.jpg'),
  'dr. maya okonkwo': require('../assets/coach-maya-okonkwo.jpg'),
  'maya okonkwo': require('../assets/coach-maya-okonkwo.jpg'),
  'marcus webb': require('../assets/coach-marcus-webb.jpg'),
  'mia chang': require('../assets/coach-mia-chang.jpg'),
  'chris martinez': require('../assets/coach-chris-martinez.jpg'),
  'dr. sarah kim': require('../assets/coach-sarah-kim.jpg'),
  'sarah kim': require('../assets/coach-sarah-kim.jpg'),

  // Interview Coaches
  'michael santos': require('../assets/coach-michael-santos.jpg'),
  'priya sharma': require('../assets/coach-priya-sharma.jpg'),
  'david park': require('../assets/coach-david-park.jpg'),
  'grace williams': require('../assets/coach-grace-williams.jpg'),

  // Presentation Coaches
  'james morrison': require('../assets/coach-james-morrison.jpg'),
  'aisha rahman': require('../assets/coach-aisha-rahman.jpg'),
  'lisa park': require('../assets/coach-lisa-park.jpg'),

  // Negotiation Coaches
  'victor reyes': require('../assets/coach-victor-reyes.jpg'),
  'catherine walsh': require('../assets/coach-catherine-walsh.jpg'),
  'omar hassan': require('../assets/coach-omar-hassan.jpg'),

  // Difficult Conversations Coaches
  'dr. nina patel': require('../assets/coach-nina-patel.jpg'),
  'nina patel': require('../assets/coach-nina-patel.jpg'),
  'marcus johnson': require('../assets/coach-marcus-johnson.jpg'),
  'emma larsson': require('../assets/coach-emma-larsson.jpg'),

  // Networking Coaches
  'derek thompson': require('../assets/coach-derek-thompson.jpg'),
  'yuki yamamoto': require('../assets/coach-yuki-yamamoto.jpg'),
  'sophia martinez': require('../assets/coach-sophia-martinez.jpg'),
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
