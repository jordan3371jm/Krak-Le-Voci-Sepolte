import { kvGet, kvSet } from '../game/kv';
// ============================================================
// Localizzazione. Le chiavi sono le frasi italiane originali
// (stile gettext): t("frase", { n: 3 }).
// Ogni lingua è un dizionario id → traduzione, dove l'id è
// l'hash della frase italiana (vedi scripts/i18n-extract.mjs).
// Inglese = lingua predefinita e di ripiego (requisito Playgama 3.4.1).
// ============================================================
import en from './en.json';
import es from './es.json';
import pt from './pt.json';
import fr from './fr.json';
import de from './de.json';
import ru from './ru.json';
import zh from './zh.json';
import ja from './ja.json';

export type Lang = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'ru' | 'zh' | 'ja' | 'it';

// Nomi delle lingue scritti nella lingua stessa (requisito 3.4.4)
export const LANGS: { id: Lang; name: string; flag: string }[] = [
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { id: 'ru', name: 'Русский', flag: '🇷🇺' },
  { id: 'zh', name: '简体中文', flag: '🇨🇳' },
  { id: 'ja', name: '日本語', flag: '🇯🇵' },
  { id: 'it', name: 'Italiano', flag: '🇮🇹' },
];

const DICTS: Partial<Record<Lang, Record<string, string>>> = { en, es, pt, fr, de, ru, zh, ja };
const LS_KEY = 'krak_voci_sepolte_lang';

export function keyId(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function normalize(code: string | undefined | null): Lang | null {
  if (!code) return null;
  const c = code.toLowerCase().slice(0, 2);
  return (LANGS.find(l => l.id === c)?.id) || null;
}

function detect(): Lang {
  try {
    const saved = normalize(kvGet(LS_KEY));
    if (saved) return saved;
  } catch { /* storage non disponibile */ }
  // Piattaforme (Playgama Bridge / CrazyGames) possono esporre la lingua del giocatore
  const w = window as any;
  const fromPlatform = normalize(w.bridge?.platform?.language) || normalize(w.CrazyGames?.SDK?.user?.systemInfo?.locale);
  if (fromPlatform) return fromPlatform;
  return normalize(typeof navigator !== 'undefined' ? navigator.language : null) || 'en';
}

let lang: Lang = typeof window !== 'undefined' ? detect() : 'en';
export const getLang = () => lang;

// Cambiare lingua ricarica la pagina: i testi dei dati vengono tradotti al caricamento.
export function setLang(l: Lang) {
  try { kvSet(LS_KEY, l); } catch { /* ignora */ }
  lang = l;
  document.documentElement.lang = l;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = key;
  if (lang !== 'it') {
    const id = keyId(key);
    s = DICTS[lang]?.[id] ?? DICTS.en?.[id] ?? key;
  }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

// Per stringhe usate come chiavi di stato (es. nomi degli stati della valle)
export const tr = (s: string) => t(s);

if (typeof document !== 'undefined') document.documentElement.lang = lang;
