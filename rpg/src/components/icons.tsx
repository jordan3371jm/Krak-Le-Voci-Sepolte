import { useId, type ReactNode } from 'react';

// ============================================================
// Icone: medaglioni incisi in stile "manoscritto miniato / reliquiario".
// Ogni icona = cornice di bronzo dorato + fondo smaltato + simbolo in oro
// (o nel colore della sua famiglia) con ombre incise e bagliore.
// ============================================================

type Tone = 'gold' | 'ember' | 'blood' | 'violet' | 'teal' | 'bone' | 'iron' | 'moss';
const TONES: Record<Tone, { a: string; b: string; c: string; bg: string; glow: string }> = {
  gold: { a: '#fff1b8', b: '#e0a93a', c: '#7a4a12', bg: '#2a1a0e', glow: '#f5b544' },
  ember: { a: '#ffd8a8', b: '#f0662a', c: '#7a1c08', bg: '#2a0f08', glow: '#ff6b2c' },
  blood: { a: '#ffb3b3', b: '#c81e3a', c: '#4a0610', bg: '#22070b', glow: '#ff3a52' },
  violet: { a: '#ead9ff', b: '#a855f7', c: '#3b0f6b', bg: '#160b24', glow: '#b86bff' },
  teal: { a: '#d7fff7', b: '#2dd4bf', c: '#0b4a44', bg: '#08201d', glow: '#38f0d4' },
  bone: { a: '#fffaf0', b: '#d9cbb0', c: '#5c4d36', bg: '#1d1914', glow: '#f3e3c3' },
  iron: { a: '#eef4fb', b: '#8fa7c0', c: '#2b3a4a', bg: '#11161c', glow: '#9cc4ee' },
  moss: { a: '#ecffd1', b: '#84cc16', c: '#2f4a0a', bg: '#121a08', glow: '#a3e635' },
};

// simbolo + tono per nome
const S: Record<string, { tone: Tone; draw: (f: string, k: string) => ReactNode }> = {};
const def = (names: string[], tone: Tone, draw: (f: string, k: string) => ReactNode) => names.forEach(n => (S[n] = { tone, draw }));
// f = riempimento (gradiente), k = colore inciso scuro

// ---------------- RISORSE ----------------
def(['cenere'], 'gold', (f, k) => <>
  <path d="M24 18h16l-2 4c5 3 8 8 8 14 0 8-6 13-14 13s-14-5-14-13c0-6 3-11 8-14z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M22 15h20v4H22z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M22 34c4 3 16 3 20 0" stroke={k} strokeWidth="1.4" fill="none" />
  <path d="M28 26l4-4 4 4-4 4z" fill={k} opacity=".6" />
</>);
def(['provviste'], 'gold', (f, k) => <>
  <path d="M14 38c0-10 8-18 18-18s18 8 18 18c0 4-4 7-18 7s-18-3-18-7z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M22 30c2-3 4-4 6-4M30 28c2-3 4-4 6-4M37 31c2-2 4-3 5-3" stroke={k} strokeWidth="1.6" strokeLinecap="round" fill="none" />
  <path d="M18 41c8 2 20 2 28 0" stroke={k} strokeWidth="1.2" opacity=".6" fill="none" />
</>);
def(['legno'], 'ember', (f, k) => <>
  <path d="M14 26l26-8 10 6-26 9z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M14 26v12l10 7V33z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M24 33l26-9v12l-26 9z" fill={f} stroke={k} strokeWidth="1.5" opacity=".9" />
  <ellipse cx="19" cy="35.5" rx="3.6" ry="5" fill="none" stroke={k} strokeWidth="1.2" />
  <ellipse cx="19" cy="35.5" rx="1.4" ry="2" fill={k} opacity=".7" />
</>);
def(['pietra'], 'iron', (f, k) => <>
  <path d="M16 40l6-16 12-6 12 8 3 12-9 8H22z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M22 24l8 10 16-8M30 34l-2 12M30 34l12 12" stroke={k} strokeWidth="1.2" fill="none" opacity=".7" />
</>);
def(['ferro'], 'iron', (f, k) => <>
  <path d="M12 38l8-12h28l-6 12z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M12 38h30v6H12z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M42 38l6-12v6l-6 12z" fill={k} opacity=".5" />
  <path d="M22 30h18" stroke="#fff" strokeWidth="1" opacity=".5" />
</>);
def(['intuizione', 'risonanza'], 'violet', (f, k) => <>
  <path d="M10 32c6-9 13-14 22-14s16 5 22 14c-6 9-13 14-22 14s-16-5-22-14z" fill={f} stroke={k} strokeWidth="1.5" />
  <circle cx="32" cy="32" r="8" fill={k} />
  <circle cx="32" cy="32" r="4" fill="#fff" opacity=".85" />
  <path d="M32 10v5M32 49v5M14 16l3 4M50 16l-3 4" stroke={f} strokeWidth="2" strokeLinecap="round" />
</>);
def(['reliquie'], 'gold', (f, k) => <>
  <path d="M26 14h12l-1 5c6 3 9 9 9 15 0 9-6 15-14 15s-14-6-14-15c0-6 3-12 9-15z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M18 28c-4 0-5 6-1 8M46 28c4 0 5 6 1 8" stroke={k} strokeWidth="2" fill="none" />
  <path d="M27 30l5-6 5 6-5 9z" fill={k} opacity=".55" />
</>);
def(['pozione'], 'blood', (f, k) => <>
  <path d="M27 13h10v9c7 3 11 8 11 15 0 8-7 13-16 13s-16-5-16-13c0-7 4-12 11-15z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M18 36c5-3 9 2 14-1s9 0 14 1" stroke={k} strokeWidth="1.3" fill="none" />
  <rect x="25" y="10" width="14" height="4" rx="1" fill={k} />
  <circle cx="27" cy="41" r="2" fill="#fff" opacity=".6" />
</>);

// ---------------- SCHEDE ----------------
def(['villaggio'], 'ember', (f, k) => <>
  <path d="M10 46V32l9-8 9 8v14z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M26 46V26l11-10 11 10v20z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M44 46V36l6-5 5 5v10z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M34 46v-8h6v8M16 46v-6h5v6" fill={k} />
  <circle cx="37" cy="27" r="2.3" fill={k} />
  <path d="M8 46h48" stroke={k} strokeWidth="2" />
</>);
def(['discesa'], 'violet', (f, k) => <>
  <path d="M12 16h40l-6 8H18zM18 24h28l-5 8H23zM23 32h18l-4 8H27zM27 40h10l-5 9z" fill={f} stroke={k} strokeWidth="1.4" />
  <circle cx="32" cy="44" r="2" fill="#fff" opacity=".8" />
</>);
def(['eroe'], 'iron', (f, k) => <>
  <path d="M32 10l13 5v12c0 11-6 18-13 22-7-4-13-11-13-22V15z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M32 16v28M24 24h16" stroke={k} strokeWidth="2.4" strokeLinecap="round" />
  <path d="M28 16l4-4 4 4" fill="none" stroke={k} strokeWidth="1.4" />
</>);
def(['bussola', 'valle'], 'gold', (f, k) => <>
  <circle cx="32" cy="32" r="16" fill="none" stroke={f} strokeWidth="2.5" />
  <path d="M32 12l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill={f} stroke={k} strokeWidth="1.3" />
  <path d="M32 12l5 15-5 5zM52 32l-15 5-5-5zM32 52l-5-15 5-5zM12 32l15-5 5 5z" fill={k} opacity=".45" />
  <circle cx="32" cy="32" r="2.5" fill={k} />
</>);
def(['compagni', 'spedizioni'], 'bone', (f, k) => <>
  <circle cx="24" cy="22" r="6" fill={f} stroke={k} strokeWidth="1.4" />
  <circle cx="40" cy="22" r="6" fill={f} stroke={k} strokeWidth="1.4" />
  <path d="M12 46c1-9 6-14 12-14s9 3 10 7M30 39c2-4 5-7 10-7 6 0 11 5 12 14" fill={f} stroke={k} strokeWidth="1.4" />
  <path d="M12 46h40" stroke={k} strokeWidth="1.6" />
</>);
def(['mercato', 'merchant'], 'violet', (f, k) => <>
  <path d="M14 20c6-3 12-3 18 0 6-3 12-3 18 0 0 14-6 24-18 26-12-2-18-12-18-26z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M18 27l9 1-1 4-8-2zM46 27l-9 1 1 4 8-2z" fill={k} />
  <path d="M26 40c4-1 8-1 12 0" stroke={k} strokeWidth="1.8" strokeLinecap="round" fill="none" />
  <path d="M32 20v6" stroke={k} strokeWidth="1.2" opacity=".6" />
</>);
def(['fazioni'], 'gold', (f, k) => <>
  <path d="M32 12v34M20 46h24" stroke={f} strokeWidth="3" strokeLinecap="round" />
  <path d="M14 20h36" stroke={f} strokeWidth="2.5" strokeLinecap="round" />
  <path d="M18 20l-6 13h12zM46 20l-6 13h12z" fill="none" stroke={f} strokeWidth="1.5" />
  <path d="M10 33a8 4 0 0 0 16 0zM38 33a8 4 0 0 0 16 0z" fill={f} stroke={k} strokeWidth="1.3" />
  <circle cx="32" cy="12" r="3" fill={f} stroke={k} />
</>);
def(['diario'], 'bone', (f, k) => <>
  <path d="M12 18c7-3 14-3 20 1v28c-6-4-13-4-20-1z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M52 18c-7-3-14-3-20 1v28c6-4 13-4 20-1z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M16 25c4-1 8-1 12 1M16 30c4-1 8-1 12 1M16 35c4-1 8-1 12 1M36 26c4-2 8-2 12-1M36 31c4-2 8-2 12-1" stroke={k} strokeWidth="1" opacity=".7" />
  <path d="M42 14v14l3-2 3 2V14" fill="#c81e3a" stroke={k} strokeWidth="1" />
</>);
def(['eredita'], 'gold', (f, k) => <>
  <path d="M14 26l6 4 6-10 6 8 6-8 6 10 6-4-4 16H18z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M18 42h28v5H18z" fill={f} stroke={k} strokeWidth="1.5" />
  <circle cx="32" cy="35" r="3" fill="#c81e3a" stroke={k} />
  <circle cx="14" cy="25" r="2" fill={f} /><circle cx="50" cy="25" r="2" fill={f} /><circle cx="32" cy="18" r="2" fill={f} />
</>);
def(['opzioni'], 'iron', (f, k) => <>
  <path d="M29 12h6l1 5 4 2 5-3 4 4-3 5 2 4 5 1v6l-5 1-2 4 3 5-4 4-5-3-4 2-1 5h-6l-1-5-4-2-5 3-4-4 3-5-2-4-5-1v-6l5-1 2-4-3-5 4-4 5 3 4-2z" fill={f} stroke={k} strokeWidth="1.3" />
  <circle cx="32" cy="32" r="7" fill={k} />
</>);

// ---------------- EDIFICI ----------------
def(['segheria'], 'ember', (f, k) => <>
  <path d="M34 14l14 14-5 5-14-14z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M30 18c-6-3-12 0-14 6 6-1 9 1 11 4z" fill={f} stroke={k} strokeWidth="1.4" />
  <path d="M27 22L14 50" stroke={k} strokeWidth="4" strokeLinecap="round" />
  <path d="M27 22L14 50" stroke={f} strokeWidth="2" strokeLinecap="round" />
  <ellipse cx="44" cy="46" rx="8" ry="4" fill={f} stroke={k} strokeWidth="1.3" />
</>);
def(['capanna'], 'moss', (f, k) => <>
  <path d="M10 36L32 14l22 22z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M16 35v13h32V35" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M28 48V38h8v10" fill={k} />
  <path d="M15 31l17-11M21 33l11-7M38 26l9 6" stroke={k} strokeWidth="1" opacity=".6" />
</>);
def(['bottega'], 'gold', (f, k) => <>
  <path d="M10 22h44l-3 8H13z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M13 30c3 3 6 3 9 0 3 3 7 3 10 0 3 3 7 3 10 0 3 3 6 3 9 0" stroke={k} strokeWidth="1.3" fill="none" />
  <path d="M15 31v17h34V31" fill="none" stroke={f} strokeWidth="2" />
  <circle cx="26" cy="42" r="3" fill={f} stroke={k} /><circle cx="34" cy="43" r="3" fill={f} stroke={k} /><circle cx="30" cy="38" r="3" fill={f} stroke={k} />
  <path d="M32 14v8" stroke={f} strokeWidth="2" />
</>);
def(['cava'], 'iron', (f, k) => <>
  <path d="M8 24c12-12 36-12 48 0l-4 4c-10-8-30-8-40 0z" fill={f} stroke={k} strokeWidth="1.6" />
  <path d="M29 18h6l-1 36h-4z" fill="#b45309" stroke={k} strokeWidth="1.4" />
  <path d="M28 18h8v6h-8z" fill={f} stroke={k} strokeWidth="1.3" />
</>);
def(['fucina'], 'ember', (f, k) => <>
  <path d="M12 26h30c6 0 10 2 12 6H40l-4 6H22l-4-6h-6z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M24 38h12l3 10H21z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M30 22c-2-4 2-6 0-10 4 2 6 6 4 10M38 22c-1-3 2-4 1-7 3 2 3 5 2 7" fill="#ffb347" stroke={k} strokeWidth="1" />
</>);
def(['altare', 'shrine'], 'gold', (f, k) => <>
  <path d="M14 40h36v8H14z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M18 34h28v6H18z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M23 22h4v12h-4zM37 22h4v12h-4zM30 18h4v16h-4z" fill="#f5ead2" stroke={k} strokeWidth="1.2" />
  <path d="M25 22c-2-3 2-5 0-8 3 2 3 5 0 8zM39 22c-2-3 2-5 0-8 3 2 3 5 0 8zM32 18c-2-3 2-5 0-8 3 2 3 5 0 8z" fill="#ffb347" />
</>);
def(['infermeria'], 'moss', (f, k) => <>
  <path d="M26 12h12v14h14v12H38v14H26V38H12V26h14z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M32 18c-4 6-4 12 0 16 4-4 4-10 0-16z" fill={k} opacity=".5" />
</>);
def(['locanda'], 'ember', (f, k) => <>
  <path d="M16 20h24v26a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M40 24h4a6 6 0 0 1 0 14h-4" fill="none" stroke={f} strokeWidth="3" />
  <path d="M14 20c2-6 6-6 8-3 2-4 7-4 9 0 2-3 7-3 9 3z" fill="#fff4dc" stroke={k} strokeWidth="1.2" />
  <path d="M22 28v14M28 28v14M34 28v14" stroke={k} strokeWidth="1.2" opacity=".6" />
</>);
def(['torre'], 'iron', (f, k) => <>
  <path d="M20 50l3-28h18l3 28z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M19 14h4v4h4v-4h4v4h4v-4h4v4h4v4H19z" fill={f} stroke={k} strokeWidth="1.4" />
  <path d="M30 28h4v7h-4zM29 42h6v8h-6z" fill={k} />
  <path d="M33 4v10M33 5l7 3-7 3" stroke={k} strokeWidth="1.2" fill="#c81e3a" />
</>);

// ---------------- FARDELLI ----------------
def(['sacrificio', 'fardello'], 'blood', (f, k) => <>
  <path d="M32 48C20 40 12 32 12 23c0-6 4-10 10-10 4 0 8 2 10 6 2-4 6-6 10-6 6 0 10 4 10 10 0 9-8 17-20 25z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M14 22l8 6 4-4 6 8 6-8 4 4 8-6" stroke={k} strokeWidth="1.6" fill="none" />
  <path d="M32 48c0 3-2 5-2 7a2 2 0 0 0 4 0c0-2-2-4-2-7z" fill={f} stroke={k} />
</>);
def(['sangue'], 'blood', (f, k) => <>
  <path d="M32 10c6 10 13 17 13 26a13 13 0 0 1-26 0c0-9 7-16 13-26z" fill={f} stroke={k} strokeWidth="1.5" />
  <ellipse cx="22" cy="44" rx="6" ry="3.5" fill="none" stroke="#c9d4df" strokeWidth="2.5" />
  <ellipse cx="32" cy="48" rx="6" ry="3.5" fill="none" stroke="#c9d4df" strokeWidth="2.5" />
  <ellipse cx="42" cy="44" rx="6" ry="3.5" fill="none" stroke="#c9d4df" strokeWidth="2.5" />
  <path d="M27 30c0-3 2-6 4-8" stroke="#fff" strokeWidth="1.5" opacity=".6" fill="none" />
</>);
def(['silenzio'], 'violet', (f, k) => <>
  <path d="M10 28c6 9 13 13 22 13s16-4 22-13" fill="none" stroke={f} strokeWidth="4" strokeLinecap="round" />
  <path d="M16 35l-4 6M24 39l-2 7M32 41v7M40 39l2 7M48 35l4 6" stroke={f} strokeWidth="2" strokeLinecap="round" />
  <path d="M22 18c6-4 14-4 20 0" stroke={f} strokeWidth="2" fill="none" strokeLinecap="round" />
  <path d="M32 46c0 3-2 5-2 7a2 2 0 0 0 4 0c0-2-2-4-2-7z" fill={f} stroke={k} />
</>);

// ---------------- CLASSI ----------------
def(['penitente'], 'bone', (f, k) => <>
  <path d="M28 10h8v14h12v8H36v22h-8V32H16v-8h12z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M20 46c4-3 8-2 12 0s8 3 12 0" stroke="#9ca3af" strokeWidth="2" fill="none" />
  <circle cx="32" cy="28" r="3" fill={k} />
</>);
def(['lama', 'combat'], 'iron', (f, k) => <>
  <path d="M46 10l-4 14-22 22-4-4 22-22z" fill={f} stroke={k} strokeWidth="1.4" />
  <path d="M18 10l4 14 22 22 4-4-22-22z" fill={f} stroke={k} strokeWidth="1.4" opacity=".9" />
  <path d="M13 41l10 10M41 51l10-10" stroke={k} strokeWidth="3.5" strokeLinecap="round" />
  <path d="M13 41l10 10M41 51l10-10" stroke="#c81e3a" strokeWidth="1.6" strokeLinecap="round" />
</>);
def(['veggente'], 'violet', (f, k) => <>
  <circle cx="32" cy="28" r="14" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M24 22c3-4 8-5 12-3" stroke="#fff" strokeWidth="2" opacity=".7" fill="none" />
  <path d="M22 44h20l3 6H19z" fill={f} stroke={k} strokeWidth="1.4" />
  <path d="M26 30c2 2 4 3 6 3s4-1 6-3c-2-2-4-3-6-3s-4 1-6 3z" fill={k} />
</>);
def(['custode'], 'ember', (f, k) => <>
  <path d="M32 8c4 8 14 12 14 24a14 14 0 0 1-28 0c0-6 3-9 5-12 1 4 3 6 5 6-2-8 1-13 4-18z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M32 26c3 5 7 7 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z" fill="#fff1b8" opacity=".85" />
</>);

// ---------------- STANZE / ALTRO ----------------
def(['elite'], 'bone', (f, k) => <>
  <path d="M32 14c10 0 16 7 16 16 0 6-3 9-6 11v7H22v-7c-3-2-6-5-6-11 0-9 6-16 16-16z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M16 24c-4-4-5-9-3-12 3 3 5 6 7 7M48 24c4-4 5-9 3-12-3 3-5 6-7 7" fill={f} stroke={k} strokeWidth="1.3" />
  <ellipse cx="26" cy="31" rx="4" ry="5" fill={k} /><ellipse cx="38" cy="31" rx="4" ry="5" fill={k} />
  <path d="M27 48v-5M32 48v-5M37 48v-5" stroke={k} strokeWidth="1.3" />
  <circle cx="26" cy="31" r="1.4" fill="#ff3a52" /><circle cx="38" cy="31" r="1.4" fill="#ff3a52" />
</>);
def(['event'], 'violet', (f, k) => <>
  <path d="M22 22c0-6 5-10 10-10s10 4 10 10c0 7-8 8-8 15h-4c0-9 7-10 7-15 0-3-2-5-5-5s-5 2-5 5z" fill={f} stroke={k} strokeWidth="1.4" />
  <circle cx="32" cy="46" r="3.5" fill={f} stroke={k} strokeWidth="1.4" />
  <path d="M14 14l3 3M50 14l-3 3M14 50l3-3M50 50l-3-3" stroke={f} strokeWidth="1.6" />
</>);
def(['trap'], 'iron', (f, k) => <>
  <path d="M10 46h44" stroke={k} strokeWidth="3" />
  <path d="M12 46l5-20 5 20zM22 46l5-26 5 26zM32 46l5-22 5 22zM42 46l5-18 5 18z" fill={f} stroke={k} strokeWidth="1.3" />
  <path d="M17 26v4M27 20v4" stroke="#c81e3a" strokeWidth="2" />
</>);
def(['treasure'], 'gold', (f, k) => <>
  <path d="M12 28c0-7 9-12 20-12s20 5 20 12z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M12 28h40v20H12z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M12 34h40M22 16v32M42 16v32" stroke={k} strokeWidth="1.3" />
  <rect x="28" y="30" width="8" height="8" rx="1" fill={k} /><circle cx="32" cy="34" r="1.5" fill={f} />
</>);
def(['ghost'], 'teal', (f, k) => <>
  <path d="M18 50V28c0-9 6-16 14-16s14 7 14 16v22l-5-4-4 4-5-4-5 4-4-4z" fill={f} stroke={k} strokeWidth="1.5" opacity=".95" />
  <ellipse cx="27" cy="28" rx="3" ry="4" fill={k} /><ellipse cx="37" cy="28" rx="3" ry="4" fill={k} />
  <path d="M28 38c3 2 5 2 8 0" stroke={k} strokeWidth="1.5" fill="none" />
</>);
def(['shadow', 'dissonanza'], 'blood', (f, k) => <>
  <ellipse cx="32" cy="32" rx="15" ry="20" fill={k} stroke={f} strokeWidth="2.5" />
  <path d="M32 18c-6 0-9 6-9 12 0 4 2 7 4 9v6h10v-6c2-2 4-5 4-9 0-6-3-12-9-12z" fill={f} opacity=".85" />
  <path d="M27 30h3M34 30h3" stroke={k} strokeWidth="2.4" strokeLinecap="round" />
</>);
def(['hunter', 'promessa'], 'gold', (f, k) => <>
  <ellipse cx="22" cy="24" rx="7" ry="5" transform="rotate(-35 22 24)" fill="none" stroke={f} strokeWidth="3.5" />
  <ellipse cx="32" cy="32" rx="7" ry="5" transform="rotate(-35 32 32)" fill="none" stroke={f} strokeWidth="3.5" />
  <ellipse cx="42" cy="40" rx="7" ry="5" transform="rotate(-35 42 40)" fill="none" stroke={f} strokeWidth="3.5" />
  <path d="M46 46c2 4 0 8-4 8" stroke={k} strokeWidth="2" fill="none" />
</>);
def(['boss'], 'blood', (f, k) => <>
  <path d="M14 22l7 6 5-12 6 10 6-10 5 12 7-6-3 16H17z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M20 38c0 8 5 12 12 12s12-4 12-12z" fill="#efe4cf" stroke={k} strokeWidth="1.4" />
  <circle cx="27" cy="43" r="2.5" fill={k} /><circle cx="37" cy="43" r="2.5" fill={k} />
</>);
def(['guida'], 'gold', (f, k) => <>
  <path d="M30 10h4v6h-4z" fill={f} />
  <path d="M22 20h20l-2 22H24z" fill={f} stroke={k} strokeWidth="1.4" />
  <circle cx="32" cy="31" r="6" fill="#fff1b8" />
  <path d="M32 26c-2 3-2 5 0 7 2-2 2-4 0-7z" fill="#f0662a" />
  <path d="M20 42h24v4H20zM26 46h12l-2 6H28z" fill={f} stroke={k} strokeWidth="1.3" />
</>);
def(['pesca'], 'teal', (f, k) => <>
  <path d="M12 34c8-10 22-10 32 0-10 10-24 10-32 0z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M44 34l10-7v14z" fill={f} stroke={k} strokeWidth="1.5" />
  <circle cx="21" cy="32" r="2" fill={k} />
  <path d="M28 28c2 4 2 8 0 12M34 28c2 4 2 8 0 12" stroke={k} strokeWidth="1" opacity=".6" fill="none" />
  <path d="M12 50c6-3 10 3 16 0s10 3 16 0 8 3 10 0" stroke={f} strokeWidth="1.5" fill="none" />
</>);
def(['cantastorie', 'musica'], 'gold', (f, k) => <>
  <path d="M22 14c10 0 22 10 22 24 0 6-4 10-10 10H22z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M22 14v34" stroke={k} strokeWidth="3" />
  <path d="M26 20v24M30 23v22M34 27v19M38 32v14" stroke={k} strokeWidth="1" />
</>);
def(['corruzione'], 'violet', (f, k) => <>
  <path d="M32 12c4 6 2 10 6 14s10 4 10 12c0 7-7 12-16 12s-16-5-16-12c0-6 5-8 7-12s1-10 9-14z" fill={f} stroke={k} strokeWidth="1.5" />
  <circle cx="26" cy="36" r="3" fill={k} /><circle cx="37" cy="31" r="2" fill={k} /><circle cx="35" cy="42" r="2.5" fill={k} />
</>);
def(['bisaccia'], 'ember', (f, k) => <>
  <path d="M18 24h28l4 22a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill={f} stroke={k} strokeWidth="1.5" />
  <path d="M24 24c0-6 4-10 8-10s8 4 8 10" stroke={k} strokeWidth="2.5" fill="none" />
  <path d="M16 32h32" stroke={k} strokeWidth="1.3" />
  <rect x="28" y="30" width="8" height="6" rx="1" fill={k} />
</>);
def(['rito', 'fullscreen'], 'blood', (f, k) => <>
  <path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6" stroke={f} strokeWidth="2.4" strokeLinecap="round" />
  <path d="M16 32c4-7 10-10 16-10s12 3 16 10c-4 7-10 10-16 10s-12-3-16-10z" fill={f} stroke={k} strokeWidth="1.5" />
  <circle cx="32" cy="32" r="6" fill={k} /><circle cx="32" cy="32" r="2.4" fill="#ffd8a8" />
</>);
def(['auto'], 'teal', (f, k) => <>
  <path d="M32 12a20 20 0 1 1-17 9" fill="none" stroke={f} strokeWidth="4" strokeLinecap="round" />
  <path d="M10 14l6 8 8-5z" fill={f} stroke={k} />
  <path d="M28 24l12 8-12 8z" fill={f} stroke={k} strokeWidth="1.3" />
</>);
def(['portale'], 'violet', (f, k) => <>
  <ellipse cx="32" cy="32" rx="14" ry="20" fill={k} stroke={f} strokeWidth="3" />
  <path d="M32 16c-6 4-8 10-6 16s8 8 6 16M32 16c6 4 8 10 6 16s-8 8-6 16" stroke={f} strokeWidth="1.4" fill="none" opacity=".8" />
  <circle cx="32" cy="32" r="4" fill="#fff" opacity=".9" />
</>);

export const ICON_NAMES = Object.keys(S);

// Mappature per i dati di gioco
export const RES_ICON: Record<string, string> = { cenere: 'cenere', provviste: 'provviste', legno: 'legno', pietra: 'pietra', ferro: 'ferro', intuizione: 'intuizione', reliquie: 'reliquie' };
export const ROOM_ICON: Record<string, string> = { combat: 'combat', elite: 'elite', event: 'event', trap: 'trap', shrine: 'shrine', treasure: 'treasure', ghost: 'ghost', shadow: 'shadow', hunter: 'hunter', boss: 'boss', merchant: 'merchant' };

const EMOJI_MAP: Record<string, string> = {
  '🎒': 'bisaccia', '👥': 'compagni', '🔨': 'fucina', '🛡️': 'eroe', '📜': 'diario', '🎓': 'eredita', '⬆️': 'eredita', '✨': 'bussola',
  '🔗': 'promessa', '🌡️': 'valle', '💠': 'intuizione', '🎭': 'mercato', '⚖️': 'fazioni', '🧭': 'spedizioni', '📅': 'diario', '🌙': 'silenzio',
  '🏆': 'eredita', '👹': 'elite', '♾️': 'portale', '👤': 'ghost', '🏺': 'reliquie', '💾': 'opzioni', '🎧': 'musica', '🤖': 'auto', '❔': 'event',
  '🃏': 'treasure', '🗝️': 'treasure', '🗻': 'boss', '🖤': 'shadow', '🚪': 'discesa', '✅': 'shrine', '🌀': 'portale', '🏥': 'infermeria',
  '🕯️': 'altare', '🎣': 'pesca', '⚔️': 'combat', '🕳️': 'discesa', '🏘️': 'villaggio', '⚙️': 'opzioni', '📖': 'diario', '🧪': 'pozione',
};

export function Icon({ name, size = 28, className = '', title, plain }: { name: string; size?: number; className?: string; title?: string; plain?: boolean }) {
  const id = useId().replace(/:/g, '');
  const sym = S[name] || S[EMOJI_MAP[name]];
  if (!sym) return <Sigil emoji={name} size={size} className={className} />;
  const t = TONES[sym.tone];
  const f = `url(#f${id})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`inline-block shrink-0 ${className}`} role="img" aria-label={title || name}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset=".55" stopColor={t.b} />
          <stop offset="1" stopColor={t.c} />
        </linearGradient>
        <radialGradient id={`bg${id}`} cx=".5" cy=".38" r=".7">
          <stop offset="0" stopColor={t.bg} stopOpacity=".2" />
          <stop offset=".55" stopColor={t.bg} />
          <stop offset="1" stopColor="#050403" />
        </radialGradient>
        <linearGradient id={`rim${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7dc8f" />
          <stop offset=".35" stopColor="#8a5a1c" />
          <stop offset=".65" stopColor="#e8c36a" />
          <stop offset="1" stopColor="#4a2c0b" />
        </linearGradient>
        <filter id={`gl${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feFlood floodColor={t.glow} floodOpacity=".55" />
          <feComposite in2="b" operator="in" result="g" />
          <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {!plain && <>
        <circle cx="32" cy="32" r="30.5" fill={`url(#bg${id})`} stroke={`url(#rim${id})`} strokeWidth="2.6" />
        <circle cx="32" cy="32" r="27" fill="none" stroke={t.glow} strokeOpacity=".22" strokeWidth=".8" strokeDasharray="1.5 2.5" />
      </>}
      <g filter={`url(#gl${id})`} transform={plain ? undefined : 'translate(32 32) scale(.86) translate(-32 -32)'}>{sym.draw(f, '#1a0f08')}</g>
    </svg>
  );
}

// Per gli elementi senza icona dedicata (nemici, abilità, oggetti):
// l'emoji viene incastonato in un medaglione con filtro "inchiostro antico".
export function Sigil({ emoji, size = 40, tone = 'bone', className = '' }: { emoji: string; size?: number; tone?: Tone; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={`sigil inline-flex items-center justify-center shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.52, background: `radial-gradient(circle at 50% 38%, ${t.bg} 0%, #070504 75%)`, boxShadow: `inset 0 0 0 2px #8a5a1c, inset 0 0 0 3px #e8c36a55, 0 0 12px ${t.glow}33` }}>
      <span className="sigil-glyph">{emoji}</span>
    </span>
  );
}
