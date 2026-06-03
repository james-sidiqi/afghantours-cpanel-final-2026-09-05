export type ParsedMarkdown = {
  frontmatter: Record<string, string>;
  body: string;
  html: string;
  excerpt: string;
};

export function parseFrontmatter(raw: string): ParsedMarkdown {
  let frontmatter: Record<string, string> = {};
  let body = raw;
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = raw.slice(3, end).trim();
      body = raw.slice(end + 4).trim();
      frontmatter = Object.fromEntries(
        fm.split('\n').map((line) => {
          const idx = line.indexOf(':');
          if (idx === -1) return [line.trim(), ''];
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '')];
        }).filter(([key]) => key)
      );
    }
  }
  const html = markdownToHtml(body);
  const excerpt = body.replace(/^#+\s+/gm, '').replace(/\n+/g, ' ').trim().slice(0, 220);
  return { frontmatter, body, html, excerpt };
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function stripGenericOpeningHeading(text: string): string {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  const first = (lines[0] || '').trim().toLowerCase().replace(/\s+/g, '');
  const generic = new Set(['#overview', '#introduction', '#shortintroduction', '#summary', '#content']);
  if (generic.has(first)) lines.shift();
  return lines.join('\n').trim();
}

export function markdownToHtml(md: string): string {
  const mdClean = stripGenericOpeningHeading(md);
  const lines = mdClean.split(/\r?\n/);
  const out: string[] = [];
  let para: string[] = [];
  let inList = false;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushPara(); closeList(); continue; }
    if (t.startsWith('# ')) { flushPara(); closeList(); out.push(`<h2>${inline(t.slice(2))}</h2>`); continue; }
    if (t.startsWith('## ')) { flushPara(); closeList(); out.push(`<h3>${inline(t.slice(3))}</h3>`); continue; }
    if (t.startsWith('### ')) { flushPara(); closeList(); out.push(`<h4>${inline(t.slice(4))}</h4>`); continue; }
    if (t.startsWith('- ') || t.startsWith('* ')) {
      flushPara();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(t.slice(2))}</li>`);
      continue;
    }
    para.push(t);
  }
  flushPara(); closeList();
  return out.join('\n');
}
