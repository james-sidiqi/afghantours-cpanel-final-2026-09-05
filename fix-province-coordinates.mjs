import fs from "fs";
import path from "path";

const dir = "src/content/provinces";

const coords = {
  bamyan: [34.77, 67.29],
  daykundi: [33.67, 66.05],
  ghazni: [33.55, 68.43],
  kabul: [34.51, 69.16],
  kapisa: [35.01, 69.67],
  logar: [34.0, 69.35],
  panjshir: [35.48, 69.75],
  parwan: [35.22, 69.15],
  wardak: [34.4, 68.8],
  khost: [33.34, 69.92],
  kunar: [35.0, 71.1],
  laghman: [34.85, 70.15],
  nangarhar: [34.39, 70.33],
  nuristan: [35.42, 71.34],
  paktia: [33.6, 69.22],
  paktika: [32.5, 68.5],
  badakhshan: [36.87, 72.0],
  baghlan: [36.03, 68.58],
  balkh: [36.73, 66.95],
  faryab: [36.08, 64.9],
  jowzjan: [36.7, 65.79],
  kunduz: [36.73, 68.87],
  samangan: [36.25, 68.03],
  "sar-e-pol": [36.21, 65.93],
  takhar: [37.16, 69.41],
  helmand: [31.43, 64.23],
  kandahar: [31.63, 65.7],
  nimroz: [30.77, 61.91],
  uruzgan: [32.63, 65.87],
  zabul: [32.1, 67.2],
  badghis: [35.01, 63.77],
  farah: [32.38, 62.11],
  ghor: [34.45, 64.76],
  herat: [34.35, 62.19],
};

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".md")) continue;

  const slug = file.replace(".md", "");
  const pair = coords[slug];
  if (!pair) continue;

  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replace(/^center_lat:\s*.*$/m, `center_lat: ${pair[0]}`);
  content = content.replace(/^center_lon:\s*.*$/m, `center_lon: ${pair[1]}`);

  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${slug}: ${pair[0]}, ${pair[1]}`);
}
