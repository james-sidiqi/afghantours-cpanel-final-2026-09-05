import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const base=path.join(root,'src','content');
function walk(dir, arr=[]){ if(!fs.existsSync(dir)) return arr; for(const f of fs.readdirSync(dir)){ const p=path.join(dir,f); const st=fs.statSync(p); if(st.isDirectory()) walk(p,arr); else if(p.endsWith('.md')) arr.push(p);} return arr; }
function slugOf(file){ const txt=fs.readFileSync(file,'utf8'); const m=txt.match(/^slug:\s*["']?([^"'\n]+)/m); return m?m[1].trim():path.basename(file,'.md'); }
const seen=new Map(), dup=[];
for(const f of walk(base)){ const rel=path.relative(base,f); if(rel.startsWith('_inactive')) continue; const coll=rel.split(path.sep)[0]; const slug=slugOf(f); const key=coll+'|'+slug; if(seen.has(key)) dup.push({collection:coll, slug, files:[seen.get(key), rel]}); else seen.set(key,rel); }
console.log(JSON.stringify({checked:seen.size, duplicate_count:dup.length, duplicates:dup}, null, 2));
