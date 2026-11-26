import fs from "fs";
import path from "path";

const dir = "src/content/provinces";

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".md")) continue;

  const filePath = path.join(dir, file);
  const raw = fs.readFileSync(filePath, "utf8");

  const parts = raw.split(/^---\s*$/m);

  if (parts.length < 4) {
    console.log(`Skipped ${file}: normal frontmatter`);
    continue;
  }

  const frontmatter = parts[1].trim();

  const bodyParts = parts
    .slice(2)
    .map((part) => part.trim())
    .filter(Boolean);

  const body = bodyParts.join("\n\n");

  const cleaned = `---\n${frontmatter}\n---\n\n${body}\n`;

  fs.writeFileSync(filePath, cleaned, "utf8");

  console.log(`Cleaned ${file}`);
}
