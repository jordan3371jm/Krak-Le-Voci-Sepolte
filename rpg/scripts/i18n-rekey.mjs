// Cambia una frase italiana sorgente e aggiorna l'id in tutti i file i18n-src: node scripts/i18n-rekey.mjs "vecchia" "nuova"
import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
function keyId(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const [oldK, newK] = process.argv.slice(2);
const a = keyId(oldK), b = keyId(newK);
const dir = path.join(root, 'i18n-src');
for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); const s = fs.readFileSync(p, 'utf8'); const r = s.split('\n').map(l => l.startsWith(a + '\t') ? b + l.slice(a.length) : l).join('\n'); if (r !== s) fs.writeFileSync(p, r); }
console.log(a, '→', b);
