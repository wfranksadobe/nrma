/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards  (base block: cards, container block)
 * Source: https://www.nrma.com.au/  — runs on section containers
 *   ".cmp-container--background-primary-colour" (promo offer cards) and
 *   ".cmp-container--background-neutral-colour" (product cards, why-choose callouts, blog cards).
 * Library convention: container block, zero-to-N children; each card = ONE row with 2 cells:
 *   cell 1 = image/icon (model fields image + imageAlt), cell 2 = text (richtext) holding
 *   title/description/CTA. An image cell may be empty but MUST still be included.
 * Handles four visual treatments robustly (promo sidekick, product grid, leaf callout, blog article).
 * Generated for NRMA homepage migration.
 */
import { buildInfoCardBlock } from './info-card.js';

export default function parse(element, { document }) {
  const fieldCell = (fieldName, ...nodes) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${fieldName} `));
    nodes.filter(Boolean).forEach((n) => frag.appendChild(n));
    return frag;
  };

  const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // --- 0. Product cards → Info Card blocks. ---
  // The product-grid cards (Car & Vehicle / Home & Property / Business / Travel)
  // are a distinct split-panel design, migrated to the dedicated Info Card block
  // rather than the generic Cards block. Build them here and emit as section
  // siblings (in document order) so the rest of the section still becomes a
  // Cards block. A product card = a grid item with a product link-list + title.
  const productItems = Array.from(element.querySelectorAll('.grid-container__item'))
    .filter((item) => item.querySelector('.cmp-iag-list a[href]')
      && item.querySelector('h2, h3, h4, .cmp-title__text'));
  const infoCardBlocks = productItems.map((item) => buildInfoCardBlock(item, document));

  // --- 1. Collect candidate card items across the remaining treatments. ---
  const candidates = [];
  const push = (nodes) => nodes.forEach((n) => { if (!candidates.includes(n)) candidates.push(n); });

  push(Array.from(element.querySelectorAll('.cmp-bento__sidekick')));            // promo offer cards
  push(Array.from(element.querySelectorAll('.cmp-article-preview-list__item'))); // blog cards
  push(Array.from(element.querySelectorAll('.cmp-call-out')));                   // why-choose callouts

  // Drop candidates nested inside another candidate (avoid double capture),
  // then restore source (document) order so cards read top-to-bottom as authored.
  const cards = candidates
    .filter((c) => !candidates.some((o) => o !== c && o.contains(c)))
    .sort((a, b) => {
      const pos = a.compareDocumentPosition(b);
      if (pos & 0x02) return 1;  // a follows b (Node.DOCUMENT_POSITION_PRECEDING)
      if (pos & 0x04) return -1; // a precedes b (Node.DOCUMENT_POSITION_FOLLOWING)
      return 0;
    });

  if (!cards.length && !infoCardBlocks.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // --- 2. Build a 2-cell row per card. ---
  const cells = [];

  cards.forEach((card) => {
    // image: first real raster image (skip decorative inline data-URI pictograms when a real one exists)
    const imgs = Array.from(card.querySelectorAll('img'));
    const image = imgs.find((i) => i.getAttribute('src') && !i.getAttribute('src').startsWith('data:')) || imgs[0] || null;

    // body pieces, assembled in reading order into the single richtext "text" field
    const body = [];

    const date = card.querySelector('.cmp-article-preview-list__date');
    const category = card.querySelector('.cmp-article-preview-list__category');
    if (date || category) {
      const meta = document.createElement('p');
      meta.textContent = [textOf(date), textOf(category)].filter(Boolean).join(' — ');
      body.push(meta);
    }

    const heading = card.querySelector(
      '.cmp-call-out__title, .cmp-article-preview-list__title, .cmp-bento__sidekick__content h2, .cmp-title__text, h2, h3, h4',
    );
    if (heading) {
      const level = /^h[1-6]$/i.test(heading.tagName) ? heading.tagName.toLowerCase() : 'h3';
      const h = document.createElement(level);
      h.textContent = textOf(heading);
      body.push(h);
    }

    // descriptive copy
    const descSelectors = '.cmp-call-out__description, .cmp-article-preview-list__description, .cmp-text p, .cmp-bento__sidekick__content > p';
    const descs = Array.from(card.querySelectorAll(descSelectors));
    (descs.length ? descs : Array.from(card.querySelectorAll(':scope > p'))).forEach((d) => {
      const p = document.createElement('p');
      p.textContent = textOf(d);
      if (p.textContent) body.push(p);
    });

    // promo code (offer cards) — surface as text so nothing is lost
    const promoCard = card.querySelector('.copypromocode');
    if (promoCard) {
      const codeVal = textOf(promoCard.querySelector('.default'));
      if (codeVal) {
        const p = document.createElement('p');
        p.textContent = `Promo code: ${codeVal}`;
        body.push(p);
      }
    }

    // product link list → real anchor list
    const listLinks = Array.from(card.querySelectorAll('.cmp-iag-list a[href]'));
    if (listLinks.length) {
      const ul = document.createElement('ul');
      listLinks.forEach((a) => {
        const li = document.createElement('li');
        const na = document.createElement('a');
        na.setAttribute('href', a.getAttribute('href'));
        na.textContent = textOf(a);
        li.appendChild(na);
        ul.appendChild(li);
      });
      body.push(ul);
    }

    // CTA buttons/links (exclude the promo-code copy button which has no href)
    const ctaLinks = Array.from(card.querySelectorAll('a.cmp-button[href], .cmp-button a[href], .cmp-article-preview-list__button-container a[href], .buttongroup a[href]'));
    // Dedup by element identity (overlapping selectors), not href, so distinct CTAs survive.
    const seenHref = new Set();
    ctaLinks.forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || seenHref.has(a)) return;
      seenHref.add(a);
      const p = document.createElement('p');
      const na = document.createElement('a');
      na.setAttribute('href', href);
      na.textContent = textOf(a) || 'Learn more';
      p.appendChild(na);
      body.push(p);
    });

    // blog tags
    const tags = Array.from(card.querySelectorAll('.cmp-article-preview-list__tag'));
    if (tags.length) {
      const p = document.createElement('p');
      p.textContent = tags.map((t) => textOf(t)).filter(Boolean).join(', ');
      if (p.textContent) body.push(p);
    }

    // 2 cells: image (optional → empty cell, no hint) + text (richtext, hinted).
    let imageCell = '';
    if (image) {
      if (!image.getAttribute('alt')) image.setAttribute('alt', '');
      imageCell = fieldCell('image', image);
    }
    cells.push([imageCell, fieldCell('text', ...body)]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });

  // --- 3. Preserve the section intro (title + lead paragraph). ---
  // The section container often opens with a centred intro — a title and a short
  // lead paragraph — that sits ABOVE the cards. It is not one of the card items,
  // so without this it would be discarded when we replace the container. Emit it
  // as default content before the block so it renders at the top of the section.
  const outsideCards = (el) => el && !cards.some((c) => c.contains(el));
  const introNodes = [];
  // the intro title is the first .cmp-title__text that is NOT inside a card
  // (product cards also use .cmp-title__text for their headings).
  const titleEl = Array.from(element.querySelectorAll('.cmp-title__text'))
    .find((t) => outsideCards(t) && textOf(t));
  if (titleEl) {
    const h = document.createElement('h2');
    h.textContent = textOf(titleEl);
    introNodes.push(h);

    const lead = Array.from(element.querySelectorAll('.cmp-text p'))
      .find((p) => outsideCards(p) && textOf(p));
    if (lead) {
      const p = document.createElement('p');
      p.textContent = textOf(lead);
      introNodes.push(p);
    }
  }

  // --- 4. "Explore all products" link below the product grid. ---
  // A section-level CTA (e.g. "Explore all products" → /insurance) sits beneath
  // the product cards. It's not a card, so emit it as default content after the
  // Info Card blocks. Match a .cmp-button outside all cards that isn't one of
  // the cards' own "See … insurance" CTAs.
  const afterNodes = [];
  if (infoCardBlocks.length) {
    // exclude CTAs inside the product cards (their "See … insurance" buttons)
    const inProductCard = (el) => productItems.some((it) => it.contains(el));
    const sectionCta = Array.from(element.querySelectorAll('a.cmp-button[href], .cmp-button a[href]'))
      .find((a) => outsideCards(a) && !inProductCard(a) && textOf(a));
    if (sectionCta) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', sectionCta.getAttribute('href'));
      a.textContent = textOf(sectionCta);
      p.appendChild(a);
      afterNodes.push(p);
    }
  }

  // Emit: intro (title + lead) → Info Card blocks (product grid) → section CTA
  // → Cards block (remaining callouts/blog). Skip the Cards block if there were
  // no non-product cards, so a pure product-grid section is just info cards.
  const out = [...introNodes, ...infoCardBlocks, ...afterNodes];
  if (cards.length) out.push(block);
  element.replaceWith(...out);
}
