import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const files = [];
function walk(dir){ if(!fs.existsSync(dir)) return; for(const f of fs.readdirSync(dir)){ const p=path.join(dir,f); const st=fs.statSync(p); if(st.isDirectory()) walk(p); else if(/\.(astro|ts|js|md|csv)$/i.test(p)) files.push(p); }}
walk(path.join(root,'src')); walk(path.join(root,'data'));
const refs = new Map();
const re = /\/assets\/images\/[^\s"'`)},\]]+/g;
for(const f of files){ const txt=fs.readFileSync(f,'utf8'); for(const m of txt.matchAll(re)){ let ref=m[0].replace(/[.,;]+$/,''); if(ref.includes(';')) ref=ref.split(';')[0]; if(ref.includes('${')) continue; if(!refs.has(ref)) refs.set(ref,[]); refs.get(ref).push(path.relative(root,f)); }}
let missing=[];
for(const [ref,from] of refs){ const full=path.join(root,'public',ref.replace(/^\//,'')); if(!fs.existsSync(full)) missing.push({ref,from:[...new Set(from)].slice(0,5)}); }
console.log(JSON.stringify({total_refs:refs.size, missing_count:missing.length, missing}, null, 2));
