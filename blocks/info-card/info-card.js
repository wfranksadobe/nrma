/*
 * Info Card block
 * A product card split into two stacked panels:
 *   - a COLOURED top panel: icon, title, body text (on a hex background)
 *   - a WHITE bottom panel: rich text (typically a list of links) + a CTA button
 *
 * Model field groups (row order): image, title, text, backgroundColor, links, cta.
 *
 * The icon is delivered as an :token: (localhost) or a span.icon.icon-<token>
 * (EDS/DA); it maps to a white SVG in /icons. Rows are identified by CONTENT so
 * this is robust to both the local plain.html and the AEM/JCR render.
 */

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TOKEN_RE = /^:([A-Za-z0-9_-]+):$/;

/**
 * Resolve the card icon from a row: either raw ":token:" text (localhost) or a
 * pre-decorated span.icon.icon-<token> (EDS/DA). Returns an <img> or null.
 */
function resolveIcon(row) {
  const base = window.hlx && window.hlx.codeBasePath ? window.hlx.codeBasePath : '';
  // EDS/DA: a decorated span.icon carries the token in its icon-<name> class.
  const span = row.querySelector('span.icon');
  let token = null;
  if (span) {
    const cls = [...span.classList].find((c) => c.startsWith('icon-'));
    if (cls) token = cls.slice(5);
  }
  // localhost: raw ":token:" text
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

export default function decorate(block) {
  const rows = [...block.children];

  // AEM may deliver a hex auto-linked as a URL fragment; pull the trailing hex.
  const extractHex = (raw) => {
    const m = (raw || '').trim().match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
    return m ? m[0] : null;
  };
  const isIconRow = (r) => r.querySelector('span.icon') || TOKEN_RE.test(r.textContent.trim());

  // icon row = raw :token: text or a decorated span.icon
  const iconRow = rows.find(isIconRow);
  // colour row = a short row whose visible text is just a hex code
  const colourRow = rows.find((r) => r !== iconRow && HEX_RE.test(r.textContent.trim()));
  // links row = the rich body carrying the link LIST (white panel)
  const listRow = rows.find((r) => r !== iconRow && r !== colourRow && r.querySelector('ul'));
  // cta row = a standalone link, not inside a list
  const ctaRow = rows.find((r) => r !== iconRow && r !== colourRow && r !== listRow
    && r.querySelector('a[href]') && !r.querySelector('ul'));

  const used = new Set([iconRow, colourRow, listRow, ctaRow]);
  const remaining = rows.filter((r) => !used.has(r) && r.textContent.trim());
  // title = first remaining text row; text = the next remaining rich row
  const titleRow = remaining[0] || null;
  const textRow = remaining[1] || null;

  const colour = extractHex(colourRow?.textContent);
  if (colour) block.style.setProperty('--info-card-bg', colour);

  // ---- Coloured top panel ----
  const top = document.createElement('div');
  top.className = 'info-card-top';

  const icon = iconRow ? resolveIcon(iconRow) : null;
  if (icon) {
    const media = document.createElement('div');
    media.className = 'info-card-icon';
    media.append(icon);
    top.append(media);
  }

  if (titleRow && titleRow.textContent.trim()) {
    const h = document.createElement('h3');
    h.className = 'info-card-title';
    const inner = titleRow.firstElementChild;
    h.append(...(inner ? inner.childNodes : titleRow.childNodes));
    top.append(h);
  }

  if (textRow && textRow.textContent.trim()) {
    const body = document.createElement('div');
    body.className = 'info-card-text';
    const inner = textRow.firstElementChild;
    body.append(...(inner ? inner.childNodes : textRow.childNodes));
    top.append(body);
  }

  // ---- White bottom panel ----
  const bottom = document.createElement('div');
  bottom.className = 'info-card-bottom';

  if (listRow && listRow.textContent.trim()) {
    const white = document.createElement('div');
    white.className = 'info-card-links';
    const inner = listRow.firstElementChild;
    white.append(...(inner ? inner.childNodes : listRow.childNodes));
    bottom.append(white);
  }

  const ctaAnchor = ctaRow?.querySelector('a[href]');
  if (ctaAnchor) {
    const actions = document.createElement('div');
    actions.className = 'info-card-actions';
    ctaAnchor.className = 'info-card-cta';
    actions.append(ctaAnchor);
    bottom.append(actions);
  }

  block.replaceChildren(top, bottom);
}
