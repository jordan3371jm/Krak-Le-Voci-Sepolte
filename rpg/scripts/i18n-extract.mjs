// Estrae tutte le chiavi t('...') / T('...') dal sorgente e produce scripts/i18n-keys.json { id: frase }
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
function keyId(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|mjs)$/.test(f)) files.push(p); } })(path.join(root, 'src'));
const keys = {};
const re = /\b[tT]\('((?:[^'\\]|\\.)*)'/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(src))) {
    const k = m[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    keys[keyId(k)] = k;
  }
}
fs.writeFileSync(path.join(root, 'scripts/i18n-keys.json'), JSON.stringify(keys, null, 1));
const total = Object.values(keys).reduce((a, k) => a + k.length, 0);
console.log('chiavi', Object.keys(keys).length, 'caratteri', total);
// copertura delle lingue
for (const l of ['en', 'es', 'pt', 'fr', 'de', 'ru', 'zh', 'ja']) {
  const p = path.join(root, `src/i18n/${l}.json`);
  const d = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  const missing = Object.keys(keys).filter(id => !(id in d));
  console.log(l, 'tradotte', Object.keys(keys).length - missing.length, 'mancanti', missing.length);
}
