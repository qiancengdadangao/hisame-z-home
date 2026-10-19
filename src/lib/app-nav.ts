// Shared navigation lookup — used by AppHeader (for its back button + title)
// and EdgeSwipeBack (so the swipe-back gesture lands on the same semantic
// parent, not the raw browser history stack, giving the app-native feel of
// "back always returns to the room hub / chat hub").

export type T = { en: string; cn: string };

// Route → { title, cn }. This is the canonical registry of "known rooms".
export const TITLES: Record<string, T> = {
  '/seminar':       { en: 'Seminar',   cn: '讲堂' },
  '/health':        { en: 'Health',    cn: '医疗' },
  '/memory':        { en: 'Memory',    cn: '记忆' },
  '/calendar':      { en: 'Calendar',  cn: '日历' },
  '/music':         { en: 'Music',     cn: '听歌' },
  '/box':           { en: 'Keepsakes', cn: '藏物阁' },
  '/navi':          { en: 'Navi',      cn: '导航' },
  '/call':          { en: 'Call',      cn: '通话' },
  '/nearby':        { en: 'Nearby',    cn: '附近' },
  '/backstage':     { en: 'Backstage', cn: '后台' },
  '/anfang':        { en: 'Anfang',    cn: '安房' },
  '/chat':          { en: 'Chats',     cn: '对话' },
  '/chat/messages': { en: 'Messages',  cn: '短信' },
  '/daily':         { en: 'Diary',     cn: '日常' },
  '/tangents':      { en: 'Memo',      cn: '碎碎念' },
  '/training':      { en: 'Training',  cn: '调教' },
  '/deeptalk':      { en: 'Deeptalk',  cn: '促膝' },
  '/study':         { en: 'Study',     cn: '书房' },
  '/feast':         { en: 'Feast',     cn: '餐桌' },
  '/shopping':      { en: 'Shopping',  cn: '采买' },
  '/eat':           { en: 'Eat',       cn: '吃饭' },
  '/april20':       { en: 'April 20',  cn: '领证日' },
  '/july1':         { en: 'July 1',    cn: '生日' },
  '/pulse':         { en: 'Pulse',     cn: '脉搏' },
  '/closet':        { en: 'Closet',    cn: '衣橱' },
  '/car':           { en: 'Drive',     cn: '驾' },
  '/mute':          { en: 'Hush',      cn: '息' },
};

// Explicit parent overrides for pages whose natural URL parent is '/' but
// which conceptually belong under another hub (e.g. chat sub-rooms reached
// from /chat should back-arrow to /chat, not the home hub).
//
// These apply only for skins that render a real /chat hub. Under "flat-home"
// skins (see FLAT_HOME_SKINS below) the home page itself lists every room
// including the four /chat children, so back arrow / edge-swipe from a chat
// sub-room should return to '/', not to a hub that isn't there.
export const PARENT_OVERRIDE: Record<string, string> = {
  '/daily': '/chat',
  '/tangents': '/chat',
  '/deeptalk': '/chat',
  '/training': '/chat',
};

// Skins whose home page is a flat grid of every room (no dedicated /chat
// hub). Under these skins, the PARENT_OVERRIDE above is skipped, and
// /chat/messages also folds back to '/'. Keep this in sync with which skin
// homes actually list the four chat children directly.
const FLAT_HOME_SKINS = new Set(['hisame-signal', 'angelcore']);

export function lookup(
  path: string,
  skin?: string | null,
): { title: T; parent: string } | null {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return null;
  const isFlatHome = !!skin && FLAT_HOME_SKINS.has(skin);
  if (TITLES[clean]) {
    const seg = clean.split('/').filter(Boolean);
    const computedParent = seg.length > 1 ? '/' + seg.slice(0, -1).join('/') : '/';
    const override = PARENT_OVERRIDE[clean];
    // Flat-home skins: any chat-adjacent parent folds back to '/', because
    // there is no /chat hub to return to under those skins.
    let parent: string;
    if (isFlatHome) {
      if (clean === '/chat/messages') parent = '/';
      else if (override === '/chat') parent = '/';
      else parent = computedParent;
    } else {
      parent = override ?? computedParent;
    }
    return { title: TITLES[clean], parent };
  }
  const seg = clean.split('/').filter(Boolean);
  for (let i = seg.length - 1; i > 0; i--) {
    const base = '/' + seg.slice(0, i).join('/');
    if (TITLES[base]) return { title: TITLES[base], parent: base };
  }
  return null;
}

/** Just the parent — convenient for consumers that only care about back-nav. */
export function lookupParent(path: string, skin?: string | null): string {
  return lookup(path, skin)?.parent ?? '/';
}
