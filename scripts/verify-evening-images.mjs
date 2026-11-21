import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root=path.resolve('dist'),reports=path.resolve(process.env.AFGHAN_IMAGE_REPORTS||'../reports/evening-changes-20261117');
const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/evening-image-changes-20261117.json','utf8'));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`,chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({...fs.existsSync(chrome)?{executablePath:chrome}:{},headless:true});
const routes=[...new Set(['/', '/attractions/','/food-culture/','/cultural-experiences/','/activities/',...Object.keys(fixture.checks)])];const results=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  for(const route of routes){
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(base+route,{waitUntil:'networkidle'});
   await page.locator('img').evaluateAll(async xs=>{await Promise.all(xs.filter(x=>x.getAttribute('src')).map(x=>{x.loading='eager';return x.decode().catch(()=>{});}));});
   const broken=await page.locator('img').evaluateAll(xs=>xs.filter(x=>x.getAttribute('src')&&!x.naturalWidth).map(x=>x.getAttribute('src')));assert.deepEqual(broken,[],route);assert.deepEqual(errors,[],route);
   assert(!/Chicken\s+(?:Kabuli|Qabili)|\bOuzi\b|Paktika Livestock Markets/i.test(await page.locator('body').innerText()),route+' still displays a removed entry');
   const expected=fixture.checks[route];
   if(expected){
    const hero=await page.locator('main img, section img').evaluateAll(xs=>xs.find(x=>x.getAttribute('src')?.startsWith('/assets/')&&!x.getAttribute('src').includes('/logo/'))?.getAttribute('src'));assert.equal(hero,expected.hero,route+' hero');
    if(expected.gallery){const actual=await page.locator('.gallery-grid img,.culin-gallery img,.food-gallery-grid img,.gal-grid img,.culture-gallery img').evaluateAll(xs=>xs.map(x=>x.getAttribute('src')));assert.deepEqual(actual,expected.gallery,route+' gallery');}
   }
   if(route==='/food-culture/'){
    for(const [title,src]of [['Afghan Grapes',fixture.grapes],['Rosh (Rosht)',fixture.rosh]]){const card=page.locator('article.food-card').filter({has:page.locator('h3',{hasText:title})}).first();assert.equal(await card.locator('img').getAttribute('src'),src);if(width===390&&title==='Afghan Grapes')await card.screenshot({path:path.join(reports,'iphone-afghan-grapes-card.png')});}
   }
   if(route==='/cultural-experiences/'){
    const card=page.locator('a').filter({has:page.locator('img[src="'+fixture.glassblowers+'"]')}).first();assert(await card.count());if(width===390)await card.screenshot({path:path.join(reports,'iphone-glassblowers-card.png')});
   }
   if(width===390&&['/activities/fishing/','/food-culture/produce/kandahar-grapes/','/cultural-experiences/glassblowers-of-herat/','/cultural-experiences/kuchi-nomads/'].includes(route)){await page.screenshot({path:path.join(reports,'iphone-'+route.split('/').filter(Boolean).at(-1)+'-hero.png')});}
   results.push({route,width,broken,errors,selectionChecked:!!expected});console.log('IMAGE_PAGE',width,route,'passed');await page.close();
  }
  await context.close();
 }
 fs.writeFileSync(path.join(reports,'image-browser-results.json'),JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
