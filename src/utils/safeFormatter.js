import DOMPurify from "dompurify";

const DEFAULT_ALLOWED_TAGS = [
  "div",
  "p",
  "br",
  "strong",
  "b",
  "em",
  "u",
  "span",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "caption",
  "col",
  "colgroup",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
];

const DEFAULT_ALLOWED_ATTR = [
  "class",
  "rowspan",
  "colspan",
  "align",
  "width",
  "href",
  "title",
  "target",
  "rel",
  "data-chat-block",
];

function defaultSanitizeOptions(options = {}) {
  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttrs = DEFAULT_ALLOWED_ATTR,
    ...rest
  } = options;

  return {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttrs,
    ...rest,
  };
}

function wrapTables(html, wrapperClass) {
  if (!wrapperClass) return html;
  return html.replace(
    /(<table[\s\S]*?<\/table>)/gi,
    `<div class="${wrapperClass}">$1</div>`
  );
}

export function createSafeFormatter(md, options = {}) {
  const {
    sanitizeOptions,
    markdownWrapper = (content) => `<div>${content}</div>`,
    htmlWrapper = (content) => `<div>${content}</div>`,
    tableWrapperClass = "",
  } = options;

  const sanitizeConfig = defaultSanitizeOptions(sanitizeOptions);

  return function safeFormat(text = "") {
    try {
      const raw = String(text ?? "");
      const sanitize = (html) => DOMPurify.sanitize(html, sanitizeConfig);

      const hasHtml =
        /<\/?[a-z][\s\S]*>/i.test(raw) && !/```/.test(raw || "");
      if (hasHtml) {
        return sanitize(wrapTables(raw, tableWrapperClass));
      }

      let normalized = raw.replace(/\r\n?/g, "\n");
      normalized = normalized.replace(/\n{3,}/g, "\n\n");
      normalized = normalized.replace(/(\n\|[^\n]*\n)(?!\|)/g, "$1\n");
      normalized = normalized.replace(/(\n[^\n]*\t[^\n]*\n)(?![^\n]*\t)/g, "$1\n");
      normalized = normalized.replace(/(\n\|?\s*:?-{3,}.*\|\s*\n)(?!\|)/g, "$1\n");
      normalized = normalized.replace(/(\n\|[^\n]*\n)(?=\s*(?:🔹|✅))/g, "$1\n");
      normalized = normalized.trim().replace(/\n{3,}/g, "\n\n");

      const htmlFence = /```html([\s\S]*?)```/gi;
      let out = "";
      let lastIndex = 0;
      let match;

      while ((match = htmlFence.exec(normalized)) !== null) {
        const before = normalized.slice(lastIndex, match.index);
        if (before) {
          const rendered = md ? md.render(before) : before;
          out += markdownWrapper(rendered);
        }

        const rawHtml = (match[1] || "").trim();
        out += htmlWrapper(sanitize(rawHtml));
        lastIndex = htmlFence.lastIndex;
      }

      const tail = normalized.slice(lastIndex);
      if (tail) {
        const rendered = md ? md.render(tail) : tail;
        out += markdownWrapper(rendered);
      }

      out = out.replace(/(<br\s*\/?>|\s)+$/i, "");
      out = wrapTables(out, tableWrapperClass);

      return sanitize(out);
    } catch (error) {
      console.error("safeFormat error:", error);
      return DOMPurify.sanitize(String(text ?? ""), sanitizeConfig);
    }
  };
}
