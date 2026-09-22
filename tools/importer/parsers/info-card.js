/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: info-card (base block: info-card).
 * Source: https://www.nrma.com.au/ — the four product cards in the first neutral
 * section ("Insurance to cover a whole range of things in life"): Car & Vehicle,
 * Home & Property, Business, Travel.
 *
 * Each source card is a split panel:
 *   - coloured top: a product icon, a title, a short description
 *   - white bottom: a list of product links, and a "See … insurance" CTA button
 *
 * Emits one Info Card block per card. Model field GROUPS (must match
 * blocks/info-card/_info-card.json for the md2jcr round-trip — one table row per
 * group; ctaText collapses into cta and is read from the link's own text):
 *   image, title, text, backgroundColor, links, cta.
 *
 * The icon is a private-use glyph of the NRMA "product" font; we captured white
 * PNG versions into icons/ (car-white, home-white, business_insurance-white,
 * travel-white) and reference them as :token: icons in the image cell.
 */
/**
 * Build (but do not insert) an Info Card block table for a single source
 * product-card grid item. Exported so the cards parser — which owns the whole
 * neutral section container — can emit info cards inline as section siblings.
 * @returns {HTMLElement} the block <table>
 */
export function buildInfoCardBlock(element, document) {
  const fieldCell = (fieldName, ...nodes) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${fieldName} `));
    nodes.filter(Boolean).forEach((n) => frag.appendChild(n));
    return frag;
  };
  const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // Map the source inline-icon class to one of our captured white icons.
  const iconToken = (item) => {
    const ic = item.querySelector('.cmp-inline-icon__icon');
    const cls = ic ? [...ic.classList].find((c) => c.startsWith('i-product')) : '';
    if (/car/.test(cls)) return 'car-white';
    if (/home/.test(cls)) return 'home-white';
    if (/brief|business/.test(cls)) return 'business_insurance-white';
    if (/airplane|travel/.test(cls)) return 'travel-white';
    return null;
  };

  // Per-card background hex (matches the source coloured top panel).
  const bgFor = (item) => {
    const bg = item.querySelector('.flexlayoutitem[class*="bg-"]');
    const cls = bg ? bg.className : '';
    if (/bg-primary/.test(cls)) return '#010C66'; // navy
    if (/bg-secondary/.test(cls)) return '#D7D667'; // lime
    if (/bg-accent/.test(cls)) return '#91BF9E'; // sage
    if (/bg-supplementary/.test(cls)) return '#F9AE97'; // coral
    return '#010C66';
  };

  const title = textOf(element.querySelector('.cmp-title__text'));
  const token = iconToken(element);

  // description (coloured top)
  const descEl = element.querySelector('.cmp-text p');
  const descNodes = [];
  if (descEl && textOf(descEl)) {
    const p = document.createElement('p');
    p.textContent = textOf(descEl);
    descNodes.push(p);
  }

  // white-panel link list
  const listLinks = Array.from(element.querySelectorAll('.cmp-iag-list a[href]'));
  const linkNodes = [];
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
    linkNodes.push(ul);
  }

  // CTA button ("See ... insurance") — a single link. ctaText collapses from
  // the anchor's own text, so we only emit the link.
  const ctaEl = element.querySelector('.cmp-button[href], a.cmp-button');
  const ctaHref = ctaEl ? ctaEl.getAttribute('href') : '';
  const ctaLabel = textOf(ctaEl);

  // icon -> an image cell referencing our captured white icon via :token:
  const iconP = document.createElement('p');
  iconP.textContent = token ? `:${token}:` : '';

  const mkP = (str) => { const p = document.createElement('p'); p.textContent = str; return p; };

  const ctaP = document.createElement('p');
  if (ctaHref) {
    const a = document.createElement('a');
    a.setAttribute('href', ctaHref);
    a.textContent = ctaLabel || 'Learn more';
    ctaP.appendChild(a);
  }

  // One cell per model field GROUP (md2jcr maps one row per group):
  //   image, title, text, backgroundColor, links, cta (+ctaText collapses in)
  const cells = [
    [token ? fieldCell('image', iconP) : ''],
    [fieldCell('title', mkP(title))],
    [fieldCell('text', ...descNodes)],
    [fieldCell('backgroundColor', mkP(bgFor(element)))],
    [fieldCell('links', ...linkNodes)],
    [ctaHref ? fieldCell('cta', ctaP) : ''],
  ];

  return WebImporter.Blocks.createBlock(document, { name: 'info-card', cells });
}

export default function parse(element, { document }) {
  const block = buildInfoCardBlock(element, document);
  element.replaceWith(block);
}
