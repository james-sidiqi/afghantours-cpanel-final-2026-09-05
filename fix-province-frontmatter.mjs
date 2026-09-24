import fs from "fs";
import path from "path";

const dir = "src/content/provinces";

const fieldNames = [
  "type",
  "province_code",
  "region",
  "center_lat",
  "center_lon",
  "province_image_path",
];

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".md")) continue;

  const filePath = path.join(dir, file);
  const raw = fs.readFileSync(filePath, "utf8");

  const match = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) {
    console.log(`Skipped ${file}: no standard frontmatter`);
    continue;
  }

  let frontmatter = match[1].trim();
  let body = match[2];

  const moved = [];

  for (const field of fieldNames) {
    const regex = new RegExp(`^${field}:.*$`, "m");
    const found = body.match(regex);
    if (found) {
      moved.push(found[0].replace(/^province_image_path:\s*assets\/images\/province-images\/(.+)\.jpg$/, "province_image_path: /assets/images/province/$1/hero.webp"));
      body = body.replace(regex, "").trimStart();
    }
  }

  if (!frontmatter.includes("type:")) {
    frontmatter += "\n\n" + moved.join("\n");
  }

  const cleaned = `---\n${frontmatter.trim()}\n---\n\n${body.trim()}\n`;

  fs.writeFileSync(filePath, cleaned, "utf8");
  console.log(`Fixed ${file}`);
}
