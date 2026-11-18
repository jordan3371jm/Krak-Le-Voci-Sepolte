// Unisce i file i18n-src/<lingua>-<n>.tsv (righe "id\ttraduzione") in src/i18n/<lingua>.json e verifica i segnaposto
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const keys = JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n-keys.json')));
const ph = s => (s.match(/\{[a-zA-Z0-9]+\}/g) || []).sort().join(',');
for (const lang of ['en', 'es', 'pt', 'fr', 'de', 'ru', 'zh', 'ja']) {
  const out = {};
  const dir = path.join(root, 'i18n-src');
  let problems = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.startsWith(lang + '-') && f.endsWith('.tsv')).sort()) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const tab = line.indexOf('\t');
      if (tab < 0) { console.log(lang, f, 'riga senza tab:', line.slice(0, 60)); problems++; continue; }
      const id = line.slice(0, tab).trim(); const tr = line.slice(tab + 1).replace(/\\n/g, '\n');
      if (!(id in keys)) { console.log(lang, 'id sconosciuto', id); problems++; continue; }
      if (ph(keys[id]) !== ph(tr)) { console.log(lang, 'segnaposto diversi', id, ph(keys[id]), '→', ph(tr)); problems++; }
      out[id] = tr;
    }
  }
  const missing = Object.keys(keys).filter(id => !(id in out));
  fs.writeFileSync(path.join(root, `src/i18n/${lang}.json`), JSON.stringify(out));
  console.log(lang, 'tradotte', Object.keys(out).length, 'mancanti', missing.length, 'problemi', problems);
}
