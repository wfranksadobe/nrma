/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the homepage top section (navy ".cmp-container--background-primary-colour").
 * Restructures it into a 2-column layout:
 *   Columns block wrapping [ Promo block (left) , Cards block with the 2 offer cards (right) ].
 *
 * Promo block model (blocks/promo/_promo.json): layout (select), backgroundColor (hex),
 *   text (richtext: title + copy + a bullet list of tiles using :token: icons).
 * Cards block: each offer card = one row [image, text].
 * Generated for NRMA homepage redesign.
 */
export default function parse(element, { document }) {
  const fieldCell = (fieldName, ...nodes) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${fieldName} `));
    nodes.filter(Boolean).forEach((n) => frag.appendChild(n));
    return frag;
  };
  const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // Map a quick-quote tile's product name to a promo tile :token:.
  const tileToken = (label) => {
    const l = label.toLowerCase();
    if (l.includes('car')) return 'car';
    if (l.includes('home')) return 'home';
    if (l.includes('business')) return 'business_insurance';
    if (l.includes('ctp')) return 'CTP';
    return null;
  };

  // ---------- LEFT: Promo block ----------
  const hero = element.querySelector('.bentohero, .cmp-bento__hero') || element;
  const heading = hero.querySelector('h1, h2');
  const attribution = hero.querySelector('.cmp-bento__hero__content p, p');
  const tiles = Array.from(hero.querySelectorAll('.cmp-bento__action__card'));

  const promoText = [];
  if (heading) {
    const h1 = document.createElement('h1');
    h1.textContent = textOf(heading);
    promoText.push(h1);
  }
  if (attribution) {
    const p = document.createElement('p');
    p.textContent = textOf(attribution);
    promoText.push(p);
  }
  if (tiles.length) {
    const ul = document.createElement('ul');
    tiles.forEach((tile) => {
      const name = tile.querySelector('.cmp-bento__action__card__name');
      const label = textOf(name) || textOf(tile);
      const token = tileToken(label);
      const li = document.createElement('li');
      li.textContent = token ? `:${token}: ${label}` : label;
      ul.appendChild(li);
    });
    promoText.push(ul);
  }

  const promoCells = [
    ['half'],
    ['#010C66'],
    [fieldCell('text', ...promoText)],
  ];
  const promoBlock = WebImporter.Blocks.createBlock(document, { name: 'promo', cells: promoCells });

  // ---------- RIGHT: Cards block (the 2 offer cards) ----------
  const sidekicks = Array.from(element.querySelectorAll('.cmp-bento__sidekick'));
  const cardCells = [];
  sidekicks.forEach((card) => {
    const imgs = Array.from(card.querySelectorAll('img'));
    const image = imgs.find((i) => i.getAttribute('src') && !i.getAttribute('src').startsWith('data:')) || imgs[0] || null;
    const body = [];
    const h = card.querySelector('h2, h3, .cmp-bento__sidekick__content h2');
    if (h) {
      const hh = document.createElement('h3');
      hh.textContent = textOf(h);
      body.push(hh);
    }
    Array.from(card.querySelectorAll('.cmp-bento__sidekick__content > p, .cmp-text p')).forEach((d) => {
      const p = document.createElement('p');
      p.textContent = textOf(d);
      if (p.textContent) body.push(p);
    });
    const code = card.querySelector('.cmp-copy-promo-code__code, .default');
    if (code && textOf(code)) {
      const p = document.createElement('p');
      p.textContent = `Promo code: ${textOf(code)}`;
      body.push(p);
    }
    const ctas = Array.from(card.querySelectorAll('a.cmp-button[href], .cmp-button a[href], .buttongroup a[href]'));
    const seen = new Set();
    ctas.forEach((a) => {
      if (seen.has(a) || !a.getAttribute('href')) return;
      seen.add(a);
      const p = document.createElement('p');
      const na = document.createElement('a');
      na.setAttribute('href', a.getAttribute('href'));
      na.textContent = textOf(a) || 'Learn more';
      p.appendChild(na);
      body.push(p);
    });
    let imageCell = '';
    if (image) {
      if (!image.getAttribute('alt')) image.setAttribute('alt', '');
      imageCell = fieldCell('image', image);
    }
    cardCells.push([imageCell, fieldCell('text', ...body)]);
  });
  const cardsBlock = WebImporter.Blocks.createBlock(document, { name: 'cards', cells: cardCells });

  // ---------- WRAP: columns block [ promo | cards ] ----------
  const columns = WebImporter.Blocks.createBlock(document, {
    name: 'columns',
    cells: [[promoBlock, cardsBlock]],
  });

  element.replaceWith(columns);
}
