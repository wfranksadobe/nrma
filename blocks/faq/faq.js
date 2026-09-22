/*
 * FAQ block
 * A two-part "existing customers" strip:
 *   - LEFT: a small pill (icon + tag text) above a large title
 *   - RIGHT: a stacked list of link boxes, each with a trailing chevron
 *
 * Model field groups (row order): image, tag, title, text.
 *
 * The icon is delivered as an :token: (localhost) or a span.icon.icon-<token>
 * (EDS/DA) and maps to an SVG in /icons. Rows are identified by CONTENT so this
 * is robust to both the local plain.html and the AEM/JCR render.
 */

const TOKEN_RE = /^:([A-Za-z0-9_-]+):$/;

/** Resolve the pill icon from a row (raw ":token:" or a decorated span.icon). */
function resolveIcon(row) {
  const base = window.hlx && window.hlx.codeBasePath ? window.hlx.codeBasePath : '';
  const span = row.querySelector('span.icon');
  let token = null;
  if (span) {
    const cls = [...span.classList].find((c) => c.startsWith('icon-'));
    if (cls) token = cls.slice(5);
  }
  if (!token) {
    const m = row.textContent.trim().match(TOKEN_RE);
    if (m) [, token] = m;
  }
  if (!token) return null;
  const img = document.createElement('img');
  img.src = `${base}/icons/${token}.svg`;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

/**
 * Fallback icon for the "existing customers" pill. The authored :token: icon
 * can be lost in the import round-trip; this keeps the pill's users glyph.
 */
function defaultIcon() {
  const base = window.hlx && window.hlx.codeBasePath ? window.hlx.codeBasePath : '';
  const img = document.createElement('img');
  img.src = `${base}/icons/users.svg`;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

export default function decorate(block) {
  const rows = [...block.children];

  const isIconRow = (r) => r.querySelector('span.icon') || TOKEN_RE.test(r.textContent.trim());

  // icon row = raw :token: text or a decorated span.icon
  const iconRow = rows.find(isIconRow);
  // list row = the rich body carrying the link LIST (the chevron boxes)
  const listRow = rows.find((r) => r !== iconRow && r.querySelector('ul'));

  const used = new Set([iconRow, listRow]);
  const remaining = rows.filter((r) => !used.has(r) && r.textContent.trim());
  // tag = first remaining short text row; title = the next remaining row
  const tagRow = remaining[0] || null;
  const titleRow = remaining[1] || null;

  // ---- Left column: pill (icon + tag) + title ----
  const left = document.createElement('div');
  left.className = 'faq-intro';

  const pill = document.createElement('div');
  pill.className = 'faq-pill';
  const icon = (iconRow && resolveIcon(iconRow)) || defaultIcon();
  if (icon) {
    const media = document.createElement('span');
    media.className = 'faq-pill-icon';
    media.append(icon);
    pill.append(media);
  }
  if (tagRow && tagRow.textContent.trim()) {
    const tag = document.createElement('span');
    tag.className = 'faq-pill-tag';
    const inner = tagRow.firstElementChild;
    tag.append(...(inner ? inner.childNodes : tagRow.childNodes));
    pill.append(tag);
  }
  if (pill.childNodes.length) left.append(pill);

  if (titleRow && titleRow.textContent.trim()) {
    const h = document.createElement('h2');
    h.className = 'faq-title';
    const inner = titleRow.firstElementChild;
    h.append(...(inner ? inner.childNodes : titleRow.childNodes));
    left.append(h);
  }

  // ---- Right column: the list of chevron link boxes ----
  const right = document.createElement('div');
  right.className = 'faq-links';
  if (listRow) {
    const inner = listRow.firstElementChild;
    right.append(...(inner ? inner.childNodes : listRow.childNodes));
  }

  block.replaceChildren(left, right);
}
