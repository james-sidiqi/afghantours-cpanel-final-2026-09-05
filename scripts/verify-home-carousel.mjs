import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root=path.resolve('dist'), reports=path.resolve(process.env.AFGHAN_IMAGE_REPORTS||'../reports/evening-changes-20261117');
fs.mkdirSync(reports,{recursive:true});
const baselineMode=process.argv.includes('--baseline');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`,chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
console.log('Launching isolated browser');
const browser=await chromium.launch({...fs.existsSync(chrome)?{executablePath:chrome}:{},headless:true});
console.log('Browser ready');
const baselinePath=baselineMode ? path.join(reports,'carousel-before.json') : path.resolve('scripts/fixtures/carousel-before-20261117.json');
const before=baselineMode?{}:JSON.parse(fs.readFileSync(baselinePath,'utf8')),results={};
try{
 for(const width of [1440,1024,768,390,320]){
  console.log('Viewport',width);
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<640,isMobile:width<640});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  console.log('Context ready');
  const page=await context.newPage();console.log('Page ready');const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  console.log('Navigating');await page.goto(base,{waitUntil:'networkidle'});console.log('Page loaded');await page.locator('.featured-thumb img').evaluateAll(async xs=>{await Promise.all(xs.map(x=>{x.loading="eager";return x.decode().catch(()=>{});}));});
  const snapshot=await page.evaluate(()=>{
   const style=e=>{const s=getComputedStyle(e);return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','color'].map(k=>[k,s[k]]));};
   return {cards:[...document.querySelectorAll('.featured-thumb')].map(c=>({title:c.querySelector('strong').textContent.trim(),price:c.querySelector('small').textContent.replace(/\s+/g,' ').trim(),labels:(c.querySelector('.featured-thumb-meta')||c.querySelector('span')).textContent.replace(/\s+/g,' ').trim(),src:c.querySelector('img').getAttribute('src')})),panels:[...document.querySelectorAll('.featured-active-card')].map(p=>({text:p.textContent.replace(/\s+/g,' ').trim(),links:[...p.querySelectorAll('a')].map(a=>a.getAttribute('href')),image:p.querySelector('img').getAttribute('src')})),panelStyles:[...document.querySelectorAll('.featured-active-copy h3,.featured-label,.featured-price,.featured-active-copy p')].map(style)};
  });
  if(baselineMode){results[width]=snapshot;await page.locator('.featured-rail').screenshot({path:path.join(reports,`carousel-before-${width}.png`)});await context.close();continue;}
  assert.deepEqual(snapshot,before[width],`Tour data or featured panel changed at ${width}`);
  const geometry=await page.locator('.featured-rail').evaluate(rail=>({width:rail.clientWidth,totalWidth:rail.scrollWidth,cards:[...rail.querySelectorAll('.featured-thumb')].map(c=>{const r=c.getBoundingClientRect(),t=c.querySelector('strong'),s=getComputedStyle(t);const text=[...c.querySelectorAll('strong,small,.featured-thumb-meta')];return {width:r.width,height:r.height,imgHeight:c.querySelector('img').getBoundingClientRect().height,titleSize:parseFloat(s.fontSize),titleWeight:s.fontWeight,titleLines:t.getBoundingClientRect().height/parseFloat(s.lineHeight),wordBreak:s.wordBreak,overflowWrap:s.overflowWrap,overflow:text.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({class:e.className,text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth,font:getComputedStyle(e).font}))};})}));
  assert(geometry.totalWidth>geometry.width,'Carousel must remain horizontal');
  for(const c of geometry.cards){assert(c.titleSize>=15&&c.titleSize<=16.1);assert(c.titleLines<=3.05,`Title exceeds 3 lines at ${width}`);assert.equal(c.wordBreak,'normal');assert.equal(c.overflowWrap,'normal');assert.deepEqual(c.overflow,[]);assert(Math.abs(c.imgHeight-104)<1);}
  assert(Math.max(...geometry.cards.map(c=>c.height))-Math.min(...geometry.cards.map(c=>c.height))<1,'Card heights differ');
  if(width<640){const visible=geometry.width/geometry.cards[0].width;assert(visible>=1&&visible<=1.31,'Mobile card width should show 1–1.3 cards');}
  const rail=page.locator('.featured-rail');await rail.evaluate(e=>e.scrollLeft=e.scrollWidth);await page.waitForTimeout(250);assert(await rail.evaluate(e=>e.scrollLeft)>0,'Horizontal scrolling failed');
  const last=page.locator('[data-featured-select]').last();await last.click();assert(await last.evaluate(e=>e.classList.contains('is-active')));const index=await last.getAttribute('data-featured-select');const panel=page.locator(`[data-featured-panel="${index}"]`);await panel.waitFor({state:'visible'});await panel.locator('[data-featured-open]').click();await page.locator('[data-featured-modal]').waitFor({state:'visible'});assert((await page.locator('[data-featured-modal-title]').textContent()).trim()===snapshot.cards.at(-1).title);assert(await page.locator('[data-featured-modal-itinerary]').getAttribute('href'));await page.keyboard.press('Escape');await page.locator('[data-featured-modal]').waitFor({state:'hidden'});
  // Native touch gesture, in addition to programmatic scrolling, at mobile widths.
  let touchSwipe=false;
  if(width<640){await rail.evaluate(e=>e.scrollLeft=0);await rail.scrollIntoViewIfNeeded();const box=await rail.boundingBox(),cdp=await context.newCDPSession(page);const y=Math.min(box.y+70,950),x=box.x+box.width-25;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*22,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);touchSwipe=await rail.evaluate(e=>e.scrollLeft>0);assert(touchSwipe,'Native swipe did not scroll');}
  await page.locator('[data-featured-select]').first().click();await rail.evaluate(e=>e.scrollLeft=0);await page.waitForTimeout(150);await rail.screenshot({path:path.join(reports,`carousel-after-${width}.png`)});assert.deepEqual(errors,[]);results[width]={status:'passed',geometry,touchSwipe,selection:true,preview:true,escape:true,unchangedTourData:true,unchangedFeaturedPanel:true};console.log('CAROUSEL',width,'passed');await context.close();
 }
 fs.writeFileSync(baselineMode?baselinePath:path.join(reports,'carousel-results.json'),JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
