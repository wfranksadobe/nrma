/*
 * Promo block
 * A promotional panel used at the top of the homepage (and other pages).
 * Fields (row order):
 *   1. layout           — "half" (homepage) or "full" (e.g. car-insurance page)
 *   2. backgroundColor  — hex code for the panel background
 *   3. text             — rich text: title, copy, and a bullet list of tiles.
 *                         Tile icons use :token: syntax (e.g. :car:, :home:,
 *                         :business_insurance:, :CTP:) resolved from /icons.
 */

// Image tokens the promo tiles recognise (mirrors the footer icon mechanism).
const ICON_TOKENS = {
  car: '/icons/car.svg',
  home: '/icons/home.svg',
  business_insurance: '/icons/business_insurance.svg',
  ctp: '/icons/ctp.svg',
};
const TOKEN_BY_LOWER = Object.fromEntries(
  Object.entries(ICON_TOKENS).map(([k, v]) => [k.toLowerCase(), v]),
);
const TOKEN_RE = /:([A-Za-z0-9_]+):/g;

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function buildIconImg(src, name, base) {
  const img = document.createElement('img');
  img.src = `${base}${src}`;
  img.alt = name;
  img.loading = 'lazy';
  img.className = 'promo-tile-icon';
  return img;
}

/**
 * Resolve :token: tile icons to their repo images. Handles both raw :token:
 * text (localhost) and pre-decorated span.icon.icon-<name> (EDS/DA pipeline).
 */
function resolveIconTokens(root) {
  const base = window.hlx && window.hlx.codeBasePath ? window.hlx.codeBasePath : '';

  root.querySelectorAll('span.icon').forEach((span) => {
    const iconClass = [...span.classList].find((c) => c.startsWith('icon-'));
    if (!iconClass) return;
    const key = iconClass.slice(5).toLowerCase();
    if (TOKEN_BY_LOWER[key]) span.replaceWith(buildIconImg(TOKEN_BY_LOWER[key], key, base));
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    if (TOKEN_RE.test(walker.currentNode.nodeValue)) textNodes.push(walker.currentNode);
    TOKEN_RE.lastIndex = 0;
  }
  textNodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    let last = 0;
    const text = node.nodeValue;
    let m;
    TOKEN_RE.lastIndex = 0;
    // eslint-disable-next-line no-cond-assign
    while ((m = TOKEN_RE.exec(text)) !== null) {
      const src = TOKEN_BY_LOWER[m[1].toLowerCase()];
      if (src) {
        if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
        frag.append(buildIconImg(src, m[1].toLowerCase(), base));
        last = m.index + m[0].length;
      }
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  const [layoutRow, colourRow, textRow] = rows;

  // 1. layout — half (default) or full
  const layout = (layoutRow?.textContent.trim().toLowerCase() || 'half');
  block.classList.add(layout === 'full' ? 'promo-full' : 'promo-half');
  layoutRow?.remove();

  // 2. background colour
  const colour = colourRow?.textContent.trim();
  if (colour && HEX_RE.test(colour)) block.style.setProperty('--promo-bg', colour);
  colourRow?.remove();

  // 3. text (rich text) — unwrap the cell into the block, then style pieces
  if (textRow) {
    const cell = textRow.querySelector(':scope > div') || textRow;
    const content = document.createElement('div');
    content.className = 'promo-content';
    content.append(...cell.childNodes);
    textRow.replaceWith(content);

    // the bullet list becomes the tile grid
    const list = content.querySelector('ul');
    if (list) list.classList.add('promo-tiles');
  }

  // resolve tile icon tokens
  resolveIconTokens(block);
}
