// Crea l'archivio per Playgama: index.html + playgama-bridge-config.json (+ icone) nella radice dello zip.
import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
const out = '../KRAK-playgama.zip';
execSync(`rm -f ${out} && cd dist && zip -q -r ../${out} index.html playgama-bridge-config.json icon.svg manifest.webmanifest`, { stdio: 'inherit' });
copyFileSync('dist/index.html', '../GIOCA.html');
console.log('Archivio Playgama pronto:', out.replace('../', ''));
