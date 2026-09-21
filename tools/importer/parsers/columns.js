/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: columns  (base block: columns)
 * Source: https://www.nrma.com.au/  — runs on section containers
 *   ".cmp-container--background-neutral-colour" (Existing customers strip) and
 *   ".cmp-container--background-secondary-colour" (Home loans band).
 * Library convention: name row + a second row with N cells = N side-by-side columns; each cell
 *   holds text/images/inline elements. Additional rows must keep the same column count.
 *   Columns blocks use ONLY default content — per xwalk hinting rules they get NO field:* comments.
 * Generated for NRMA homepage migration.
 */
export default function parse(element, { document }) {
  const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // Locate the target grid: prefer the home-loans grid (real image + title/CTA),
  // else the existing-customers grid (badge + heading + stacked action-link column).
  const grids = Array.from(element.querySelectorAll('.grid-container.grid'));
  const grid = grids.find((g) => g.querySelector('img[src]:not([src^="data:"])') && g.querySelector('h2, .cmp-title__text'))
    || grids.find((g) => g.querySelector('.cmp-badge') && g.querySelector('.button a[href], a.cmp-button[href]'));

  if (!grid) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Each direct grid item becomes one column cell. Keep only items with real content.
  const items = Array.from(grid.querySelectorAll(':scope > .grid-container__item'))
    .filter((it) => textOf(it) || it.querySelector('img'));

  if (!items.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Build one column cell per grid item, preserving semantic content (headings, images, links).
  const columnCells = items.map((item) => {
    const cellNodes = [];

    // badge label (e.g. "Home Loans", "Existing customers") → paragraph
    const badge = item.querySelector('.cmp-badge__text');
    if (badge && textOf(badge)) {
      const p = document.createElement('p');
      p.textContent = textOf(badge);
      cellNodes.push(p);
    }

    // real image (skip decorative data-URI pictograms)
    const image = Array.from(item.querySelectorAll('img'))
      .find((i) => i.getAttribute('src') && !i.getAttribute('src').startsWith('data:'));
    if (image) {
      if (!image.getAttribute('alt')) image.setAttribute('alt', '');
      cellNodes.push(image);
    }

    // heading
    const heading = item.querySelector('.cmp-title__text, h2, h3, h4');
    if (heading && textOf(heading)) {
      const level = /^h[1-6]$/i.test(heading.tagName) ? heading.tagName.toLowerCase() : 'h2';
      const h = document.createElement(level);
      h.textContent = textOf(heading);
      cellNodes.push(h);
    }

    // body copy (each cmp-text paragraph preserved, keeping inline links)
    Array.from(item.querySelectorAll('.cmp-text p')).forEach((p) => {
      cellNodes.push(p.cloneNode(true));
    });

    // action links / CTAs (each becomes its own paragraph anchor).
    // Dedup by element identity — overlapping selectors can match the same anchor twice,
    // but distinct links that share an href (e.g. two /payments actions) must both survive.
    const seen = new Set();
    Array.from(item.querySelectorAll('.button a[href], a.cmp-button[href]')).forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || seen.has(a)) return;
      seen.add(a);
      const p = document.createElement('p');
      const na = document.createElement('a');
      na.setAttribute('href', href);
      na.textContent = textOf(a) || 'Learn more';
      p.appendChild(na);
      cellNodes.push(p);
    });

    return cellNodes.length ? cellNodes : [''];
  });

  // Single content row, N side-by-side column cells (name row is added by createBlock).
  const cells = [columnCells];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
