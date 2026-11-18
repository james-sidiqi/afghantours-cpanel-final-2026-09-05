import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from '@playwright/test';
const root = path.resolve('dist');
const reports = path.resolve(process.env.AFGHAN_IMAGE_REPORTS || '../reports');
fs.mkdirSync(reports, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.json':'application/json', '.woff2':'font/woff2' };
const server = http.createServer((req,res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ ...(fs.existsSync(chrome) ? { executablePath:chrome } : {}), headless:true });
const cases = ["/", "/attractions/", "/food-culture/", "/cultural-experiences/", "/cultural-experiences/culinary/", "/activities/", "/attractions/minaret-of-jam/", "/attractions/kunduz-city-farmlands/", "/attractions/koh-e-baba-range/", "/attractions/badghis-hills-nomadic-pastures/", "/attractions/balkh-bala-hisar-ancient-walls/", "/attractions/haji-piyada-nine-domes/", "/attractions/tomb-of-rabia-balkhi/", "/attractions/rumi-home-madrasa/", "/attractions/ancient-city-of-balkh/", "/attractions/farah-citadel/", "/cultural-experiences/culinary/aziz-bakery/", "/cultural-experiences/culinary/kabul-chainaki/", "/food-culture/dishes/kabul-kabob/", "/food-culture/samangan-pistachios/", "/activities/hiking/", "/activities/trekking/", "/cultural-experiences/ancient-city-of-balkh/", "/attractions/ai-khanoum/", "/food-culture/dishes/ouzi/", "/food-culture/produce/logar-orchard-gardens/"];
const ownerChecks = JSON.parse(fs.readFileSync('scripts/fixtures/owner-image-changes-20261117.json', 'utf8'));
const results=[];
try {
  for (const width of [1440,390]) {
    const context=await browser.newContext({ viewport:{width,height:900}, deviceScaleFactor:1 });
    await context.route('**/*',route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    for (const route of cases) {
      const page=await context.newPage(); const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(base+route,{waitUntil:'networkidle'});
      await page.locator('img').evaluateAll(async imgs => {
        await Promise.all(imgs.filter(img=>img.getAttribute('src')).map(async img=>{img.loading='eager';try {await img.decode();}catch{}}));
      });
      const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(img=>img.getAttribute('src')&&img.complete&&img.naturalWidth===0).map(img=>img.getAttribute('src')));
      const galleryThumbs=await page.locator('.gallery-grid img, .gallery-wrap img, [data-cultural-gallery-image]').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')||img.getAttribute('data-cultural-gallery-image')).filter(src=>/(?:^|\/)(?:thumb|thumbnail|card)(?:[._-]|$)/i.test(src||'')));
      const row={route,width,broken,errors,galleryThumbs,popup_checked:false,lightbox_checked:false};
      if (route === '/food-culture/') {
        const cards = await page.locator('article.food-card').evaluateAll(cards => cards.map(card => ({ title:card.querySelector('h3')?.textContent?.trim(), src:card.querySelector('img')?.getAttribute('src') })));
        for (const title of ['Shola', 'Banjan Sia (Eggplant)', 'Sabzi Palak (Spinach)', 'Shor Nakhut (Spicy Chickpeas)', 'Kadoo (Pumpkin)', 'Qurmay Qachaloo (Potato Curry)', 'Rosh (Rosht)']) {
          if (!cards.find(card => card.title === title)?.src) throw new Error('Food image missing from card: ' + title);
        }
        if (/\/food\/produce\/farah-waterm(?:elon|ellons)\//.test(cards.find(card => card.title === 'Watermelons')?.src || '')) throw new Error('Rejected watermelon photograph resurfaced');
        row.food_cards_checked = 7;
        if(width === 390) {
          const card = page.locator('article.food-card').filter({has:page.locator('h3', {hasText:'Shor Nakhut'})}).first();
          await card.screenshot({path:path.join(reports,'iphone-shor-nakhut-card.png')});
        }
      }

      if(route==='/') {
        const preview=page.locator('[data-featured-open], [data-featured-preview]').first();
        if(await preview.count()) {
          await preview.click();
          const imgs=page.locator('[data-featured-gallery] img');
          await imgs.first().waitFor({state:'visible'});
          const bad=await imgs.evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));return imgs.filter(img=>!img.naturalWidth).map(img=>img.src);});
          row.popup_checked=true;row.popup_broken=bad;
        }
      }
      if(route.startsWith('/attractions/') && route !== '/attractions/ai-khanoum/') {
        const photo=page.locator('.gallery-grid img').first();
        if(await photo.count()) {
          await page.locator('[data-lightbox-image]').evaluate(img => new Promise(resolve => { img.onerror = () => resolve(); img.src = '/image-policy-intentional-missing-fixture.webp'; }));
          await photo.click();
          await page.locator('[data-image-lightbox][aria-hidden="false"]').waitFor({state:'visible'});
          const loaded = await page.locator('[data-lightbox-image]').evaluate(async img => { await img.decode(); return img.naturalWidth > 0 && getComputedStyle(img).visibility === 'visible' && !img.classList.contains('img-failed'); });
          if (!loaded) throw new Error('Lightbox image did not decode');
          await page.waitForTimeout(300);
          row.lightbox_checked=true;
        }
      }
      if(width===390 && (route==='/'||route.includes('ahmad-shah')||route==='/destinations/')) {
        const name=route==='/'?'home':route==='/destinations/'?'destinations':'attraction';
        await page.screenshot({path:path.join(reports,`phase2-iphone-${name}.png`),fullPage:false});
      }
      if (ownerChecks[route]) {
        const expected = ownerChecks[route];
        const hero = await page.locator('main img[src^="/assets/"]').first().getAttribute('src');
        if(hero !== expected.hero) throw new Error(route+' hero mismatch: '+hero);
        const gallery = await page.locator('.gallery-grid img, .culin-gallery img, .food-gallery-grid img').evaluateAll(imgs => imgs.map(img=>img.getAttribute('src')));
        if(JSON.stringify(gallery)!==JSON.stringify(expected.gallery)) throw new Error(route+' gallery mismatch');
        row.owner_image_selection_checked = true;
      }
      if(route==='/food-culture/') {
        const text=await page.locator('body').innerText();
        if(text.includes('Ouzi')||text.includes('The Gardens of Logar'))throw new Error('Retired food entry returned');
      }
      if(route==='/cultural-experiences/ancient-city-of-balkh/') {
        for(const slug of ['balkh-bala-hisar-ancient-walls','haji-piyada-nine-domes','tomb-of-rabia-balkhi','ancient-city-of-balkh','rumi-home-madrasa']) {
          if(!(await page.locator('a[href="/attractions/'+slug+'/"]').count()))throw new Error('Missing Balkh link '+slug);
        }
        if(width===390) await page.locator('article').filter({has:page.getByRole('heading',{name:'Places within this experience'})}).first().screenshot({path:path.join(reports,'iphone-balkh-related-places.png')});
      }
      if(width===390 && ['/cultural-experiences/culinary/aziz-bakery/','/food-culture/samangan-pistachios/','/attractions/balkh-bala-hisar-ancient-walls/'].includes(route)) {
        await page.screenshot({path:path.join(reports,'iphone-'+route.split('/').filter(Boolean).pop()+'.png'),fullPage:false});
      }
      results.push(row);console.log('BROWSER',JSON.stringify(row));await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
fs.writeFileSync(path.join(reports,'phase2-browser-results.json'),JSON.stringify(results,null,2));
if(results.some(x=>x.broken.length||x.errors.length||x.galleryThumbs.length||x.popup_broken?.length))process.exitCode=1;
