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
    // Fallback quote targets for tiles whose source CTA opens a JS modal
    // (no href). Keeps links pointing at source-site absolute URLs.
    const quoteHref = {
      car: 'https://www.nrma.com.au/car-insurance',
      home: 'https://www.nrma.com.au/home-insurance',
      business_insurance: 'https://www.nrma.com.au/business-insurance',
      CTP: 'https://www.nrma.com.au/ctp-insurance',
    };
    const ul = document.createElement('ul');
    tiles.forEach((tile) => {
      const name = tile.querySelector('.cmp-bento__action__card__name');
      const label = textOf(name) || textOf(tile);
      const token = tileToken(label);
      // source CTA — a real link if present, else the modal button label
      const cta = tile.querySelector('a[href]');
      const ctaLabel = textOf(cta) || textOf(tile.querySelector('button, .cmp-button')) || 'Get a quote';
      const href = (cta && cta.getAttribute('href')) || (token && quoteHref[token]) || '#';

      // 3 stacked rows per tile: icon, title, button
      const li = document.createElement('li');
      const iconP = document.createElement('p');
      iconP.textContent = token ? `:${token}:` : '';
      const titleP = document.createElement('p');
      titleP.textContent = label;
      const btnP = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = ctaLabel;
      btnP.appendChild(a);
      if (token) li.appendChild(iconP);
      li.appendChild(titleP);
      li.appendChild(btnP);
      ul.appendChild(li);
    });
    promoText.push(ul);
  }

  const promoCells = [
    ['half'],
    ['#27307D'],
    [fieldCell('text', ...promoText)],
  ];
  const promoBlock = WebImporter.Blocks.createBlock(document, { name: 'promo', cells: promoCells });

  // ---------- RIGHT: one Tile block per offer card ----------
  // Source offer cards carry a bg utility class (bg-accent / bg-secondary);
  // map those to brand hex tints for the tile background (adjustable later).
  const bgForCard = (card) => {
    // the bg utility class sits on the .sidekick wrapper, not the inner card
    const wrap = card.closest('.sidekick') || card.parentElement || card;
    const cls = `${wrap.className} ${card.className}`;
    if (/bg-secondary/.test(cls)) return '#D7D667'; // brand lime
    if (/bg-accent/.test(cls)) return '#91BF9E'; // brand sage green
    return '#91BF9E';
  };

  // Read an element's text with disclaimer superscripts (e.g. "6", "1") removed.
  const textNoSup = (el) => {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('sup').forEach((s) => s.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  };

  const sidekicks = Array.from(element.querySelectorAll('.cmp-bento__sidekick'));
  const tileBlocks = sidekicks.map((card) => {
    // heading (drop the disclaimer superscript number)
    const h = card.querySelector('h2, h3, .cmp-bento__sidekick__content h2');
    const heading = textNoSup(h);

    // text (rich) — description paragraphs, plus the promo code wrapped in pipes
    const textNodes = [];
    Array.from(card.querySelectorAll('.cmp-bento__sidekick__content > p, .cmp-text p')).forEach((d) => {
      const t = textNoSup(d);
      if (t) {
        const p = document.createElement('p');
        p.textContent = t;
        textNodes.push(p);
      }
    });
    // Promo code lives in the copy-button's data-code attribute.
    const codeBtn = card.querySelector('.cmp-copy-promo-code__button[data-code], [data-code]');
    const codeText = codeBtn ? (codeBtn.getAttribute('data-code') || '').trim() : '';
    if (codeText) {
      // |CODE| triggers the Tile block's one-click copy chip
      const p = document.createElement('p');
      p.textContent = `|${codeText}|`;
      textNodes.push(p);
    }

    // Buttons on the card. A "primary" button is a solid pill (quote/offer);
    // a "secondary" button is a link-style CTA (data-cmp-button-type=linkStyle).
    // Skip disclaimer superscripts (#…) and the promo-code copy button.
    const buttons = Array.from(card.querySelectorAll('a.cmp-button[href], .buttongroup a[href], .button a[href]'))
      .filter((a) => {
        const href = a.getAttribute('href') || '';
        return href && !href.startsWith('#') && !a.closest('.cmp-copy-promo-code');
      });
    const isLinkStyle = (a) => a.getAttribute('data-cmp-button-type') === 'linkStyle'
      || a.closest('.cmp-button--link');
    const primaryBtn = buttons.find((a) => !isLinkStyle(a)) || null;
    const secondaryBtn = buttons.find((a) => isLinkStyle(a) && a !== primaryBtn) || null;

    const primaryText = textOf(primaryBtn);
    const primaryHref = primaryBtn ? (primaryBtn.getAttribute('href') || '#') : '#';
    const secondaryText = textOf(secondaryBtn);
    const secondaryHref = secondaryBtn ? (secondaryBtn.getAttribute('href') || '#') : '#';

    // image
    const imgs = Array.from(card.querySelectorAll('img'));
    const image = imgs.find((i) => i.getAttribute('src') && !i.getAttribute('src').startsWith('data:')) || imgs[0] || null;
    if (image && !image.getAttribute('alt')) image.setAttribute('alt', '');
    const imageAlt = image ? (image.getAttribute('alt') || '') : '';

    const primaryLink = document.createElement('a');
    primaryLink.setAttribute('href', primaryHref);
    primaryLink.textContent = primaryHref;
    const secondaryLink = document.createElement('a');
    secondaryLink.setAttribute('href', secondaryHref);
    secondaryLink.textContent = secondaryHref;

    const cells = [
      [heading],
      [fieldCell('text', ...textNodes)],
      [primaryText],
      [primaryText ? primaryLink : ''],
      [secondaryText],
      [secondaryText ? secondaryLink : ''],
      [image ? fieldCell('image', image) : ''],
      [imageAlt],
      [bgForCard(card)],
    ];
    return WebImporter.Blocks.createBlock(document, { name: 'tile', cells });
  });

  // Stack the two tiles vertically in the right column.
  const rightCol = document.createElement('div');
  tileBlocks.forEach((t) => rightCol.appendChild(t));

  // ---------- WRAP: columns block [ promo | tiles ] ----------
  const columns = WebImporter.Blocks.createBlock(document, {
    name: 'columns',
    cells: [[promoBlock, rightCol]],
  });

  element.replaceWith(columns);
}
