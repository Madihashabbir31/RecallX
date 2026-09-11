import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=(await readdir(new URL('../dist/assets/',import.meta.url))).map(file=>'/assets/'+file);
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const revision=createHash('sha256').update(html+JSON.stringify(files)).digest('hex').slice(0,12);
const sw=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
const output=sw.replace('recallx-shell-v1',`recallx-shell-${revision}`).replace('await cache.addAll(urls);',`await cache.addAll([...urls,...${JSON.stringify(files)}]);`);
await writeFile(new URL('../dist/sw.js',import.meta.url),output);
console.log(`PWA revision ${revision}: ${files.length} local assets precached.`);
