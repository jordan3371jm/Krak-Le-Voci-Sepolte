// Divide le chiavi in blocchi numerati: node scripts/i18n-chunks.mjs <n> stampa "id\tfrase" del blocco n (0-based)
import fs from 'fs';
const keys = JSON.parse(fs.readFileSync(new URL('./i18n-keys.json', import.meta.url)));
const entries = Object.entries(keys);
const SIZE = 440;
const n = +process.argv[2];
if (isNaN(n)) { console.log('blocchi', Math.ceil(entries.length / SIZE)); process.exit(0); }
for (const [id, k] of entries.slice(n * SIZE, (n + 1) * SIZE)) console.log(id + '\t' + k.replace(/\n/g, '\\n'));
