/**
 * Tiny, dependency-free markdown → HTML for guide bodies. HTML is ESCAPED first,
 * so the output is XSS-safe even for AI-drafted content; then a safe subset of
 * markdown is applied (headings, bold/italic, links, inline code, ordered +
 * unordered lists, paragraphs). Rendered via dangerouslySetInnerHTML server-side.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Safe href: allow relative, http(s), mailto; drop everything else (javascript: …). */
function safeHref(url: string): string | null {
  const u = url.trim();
  if (u.startsWith("/") || u.startsWith("#")) return u;
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return u;
  return null;
}

/** Inline formatting on an already-escaped line. */
function inline(text: string): string {
  let out = text;
  // links [text](url) — text/url are already escaped; validate the href.
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
    const safe = safeHref(href.replace(/&amp;/g, "&"));
    if (!safe) return label;
    const rel = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener nofollow"' : "";
    return `<a href="${esc(safe)}"${rel}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = esc(md ?? "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" ")).trim()}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flushPara();
      closeList();
      const level = Math.min(Math.max(m[1].length, 2), 4); // page owns <h1>
      html.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      flushPara();
      if (list !== "ol") {
        closeList();
        list = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      para.push(line.trim());
    }
  }
  flushPara();
  closeList();
  return html.join("\n");
}
