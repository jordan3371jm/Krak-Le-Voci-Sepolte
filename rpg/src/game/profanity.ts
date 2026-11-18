// ============================================================
// Filtro delle parolacce per il nome del giocatore (requisito Playgama).
// Il nome si vede nella Veglia (multigiocatore) e nei testi del gioco:
// insulti, bestemmie, volgarità e riferimenti d'odio non sono ammessi.
// Il confronto ignora maiuscole, accenti, numeri al posto delle lettere
// (f4ck, c@zzo), lettere ripetute (fuuuck) e separatori (f.u.c.k).
// ============================================================

// Parole che non possono comparire da nessuna parte nel nome (anche dentro un'altra parola).
const STRONG = [
  // inglese
  'fuck', 'fck', 'fvck', 'fcuk', 'phuck', 'motherf', 'shit', 'bitch', 'bastard', 'asshole', 'arsehole', 'dickhead', 'cunt', 'pussy', 'whore', 'slut',
  'faggot', 'fagot', 'nigger', 'nigga', 'retard', 'wanker', 'twat', 'blowjob', 'handjob', 'dildo', 'penis', 'vagina', 'porn', 'rapist',
  'pedophil', 'paedophil', 'pedofil', 'molest', 'incest', 'jizz', 'cumshot', 'tranny', 'wetback', 'beaner', 'hitler', 'nazism', 'nazist', 'kkk',
  'jihad', 'killyourself', 'suicide', 'horny', 'milf', 'orgasm', 'masturb', 'testicle', 'scrotum', 'boob',
  // italiano
  'cazzo', 'minchia', 'mignotta', 'puttan', 'troia', 'zoccola', 'vaffanculo', 'fanculo', 'stronzo', 'stronza',
  'coglion', 'frocio', 'ricchione', 'bocchin', 'pompino', 'segaiolo', 'porcodio', 'porcamadonna',
  'diocane', 'dioporco', 'diobestia', 'cristodio', 'merda', 'bastardo', 'bastarda', 'mortacci', 'sborra',
  'scopare', 'scopata', 'trombare', 'culattone', 'cagare', 'cacca', 'pisciare', 'handicappato', 'mongoloide', 'ritardato',
  // spagnolo / portoghese
  'mierda', 'cabron', 'pendejo', 'pendeja', 'gilipollas', 'chingar', 'chingada', 'joder', 'jodete',
  'maricon', 'culero', 'mamada', 'hijodeputa', 'hdp', 'caralho', 'buceta', 'viado', 'arrombado', 'cuzao', 'foder', 'fodase',
  'vadia', 'otario', 'babaca', 'punheta', 'xoxota',
  // francese
  'merde', 'putain', 'salope', 'connard', 'connasse', 'encule', 'niquer', 'niquetamere', 'batard', 'couille', 'bordel', 'branleur', 'chienne',
  // tedesco
  'scheisse', 'scheise', 'arschloch', 'fotze', 'wichser', 'schwuchtel', 'missgeburt', 'hurensohn', 'ficken', 'schlampe',
  // russo (traslitterato)
  'blyat', 'blyad', 'pizdec', 'pizda', 'pizdets', 'khuy', 'yebat', 'mudak', 'pidor', 'pidar', 'gandon', 'zalupa', 'shluha',
];

// Parole vietate solo se sono un'intera parola del nome (dentro altre parole sono innocue:
// "Cassandra", "Monique", "Asuka", "Siegfried", "Fukuda", "magnifica").
const WEAK = ['ass', 'arse', 'cum', 'tit', 'tits', 'dick', 'cock', 'fag', 'hoe', 'jap', 'poop', 'piss', 'crap', 'sex', 'anal', 'rape', 'pedo', 'nazi', 'nig', 'niger',
  'kike', 'chink', 'spic', 'gook', 'dyke', 'homo', 'lesbo', 'boner', 'kys', 'fuk', 'fuq', 'fu', 'wtf', 'stfu', 'heil', 'sieg', 'isis',
  'culo', 'cul', 'porco', 'porca', 'fica', 'figa', 'sega', 'negro', 'finocchio', 'zingaro', 'terrone', 'puzzone', 'cazzi', 'pirla', 'scemo', 'idiota', 'idiot', 'moron', 'stupid',
  'puta', 'puto', 'putita', 'cono', 'verga', 'polla', 'porra', 'marica', 'zorra', 'pene', 'teta', 'tette', 'pute', 'pede', 'bite', 'nique', 'con', 'conne', 'zizi',
  'fick', 'hure', 'penner', 'spast', 'neger', 'suka', 'debil', 'huy', 'ebat', 'kurwa'];

// Cirillico e ideogrammi: confronto diretto sul testo in minuscolo.
const SCRIPT = ['хуй', 'хуе', 'хуё', 'пизд', 'бля', 'ебат', 'ёбан', 'ебан', 'сука', 'мудак', 'пидор', 'пидар', 'гандон', 'залуп', 'шлюх', 'дебил', 'нацист', 'гитлер',
  '傻逼', '煞笔', '操你', '肏', '他妈', '妈的', '草泥马', '婊子', '鸡巴', '屌', '贱人', '王八蛋', '去死', '希特勒', '纳粹',
  'ちんこ', 'ちんぽ', 'まんこ', 'しね', '死ね', 'くたばれ', 'ころす', '殺す', 'きちがい', '気違い', 'ヒトラー', 'ナチ', 'セックス', 'ファック'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '€': 'e', '¢': 'c', 'ß': 'ss', 'µ': 'u' };

function base(s: string) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().split('').map(ch => LEET[ch] ?? ch).join('');
}
const letters = (s: string) => s.replace(/[^a-z]/g, '');
// Ogni lettera può essere ripetuta ("fuuuck", "cazzzo"), ma "cazzo" non diventa "cazo" (che è in "Cazorla").
const rx = (w: string, whole: boolean) => { const l = letters(base(w)); return new RegExp((whole ? '^' : '') + l.split('').map(c => c + '+').join('') + (whole ? '$' : '')); };
const STRONG_RX = [...new Set(STRONG)].map(w => rx(w, false));
const STRONG_WHOLE = [...new Set(STRONG)].map(w => rx(w, true));
const WEAK_RX = [...new Set(WEAK)].map(w => rx(w, true));

/** Vero se il nome contiene una parolaccia, un insulto o un riferimento d'odio. */
export function isProfane(name: string): boolean {
  if (!name) return false;
  const raw = name.toLowerCase().normalize('NFKC');
  if (SCRIPT.some(w => raw.includes(w))) return true;
  const b = base(name);
  // tutto attaccato: "f.u.c.k", "f u c k", "Xx_fuck_xX"
  const glued = letters(b);
  if (STRONG_RX.some(r => r.test(glued))) return true;
  // parola per parola (anche le parole brevi vietate solo da sole)
  const tokens = b.split(/[^a-z]+/).filter(Boolean);
  if (tokens.some(t => WEAK_RX.some(r => r.test(t)) || STRONG_WHOLE.some(r => r.test(t)))) return true;
  // lettere separate da spazi o punti: "f u c k" → anche le parole brevi
  if (tokens.length > 2 && tokens.every(t => t.length === 1) && WEAK_RX.some(r => r.test(glued))) return true;
  return false;
}

/** Restituisce il nome se pulito, altrimenti il nome di ripiego. */
export function cleanName(name: string, fallback: string): string {
  const n = (name || '').trim();
  return n && !isProfane(n) ? n : fallback;
}
