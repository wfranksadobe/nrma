/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: faq (base block: faq).
 * Source: https://www.nrma.com.au/ — the "Existing customers / Already have a
 * policy with us?" strip in the first neutral section. A pill (users icon +
 * "Existing customers" tag) over a large title on the left, and a list of
 * link boxes (Renew your policy / Manage your payments / Make a claim) on the
 * right.
 *
 * Emits one FAQ block. Model field groups (one table row per group):
 *   image, tag, title, text (the link list).
 */

/**
 * Build (but do not insert) an FAQ block table from the existing-customers
 * strip. Exported so the cards parser — which owns the section container — can
 * emit it inline as a section sibling.
 * @param {Element} titleEl the strip's title element (.cmp-title__text)
 * @param {Element} scope the container to search for the tag/icon/links
 * @returns {HTMLElement|null} the block <table>, or null if nothing to build
 */
export function buildFaqBlock(titleEl, scope, document) {
  const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const fieldCell = (fieldName, ...nodes) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${fieldName} `));
    nodes.filter(Boolean).forEach((n) => frag.appendChild(n));
    return frag;
  };

  const title = textOf(titleEl);

  // tag pill (badge) text + icon
  const badge = scope.querySelector('.cmp-badge, [class*="badge"]');
  const tag = textOf(badge) || 'Existing customers';
  const iconEl = scope.querySelector('.cmp-badge__icon, [class*="icon"][class*="users"], .i-users');
  const iconClass = iconEl ? iconEl.className : '';
  const token = /users/.test(iconClass) ? 'users' : null;

  // link boxes — Renew your policy / Manage your payments / Make a claim
  const seen = new Set();
  const links = Array.from(scope.querySelectorAll('a[href]'))
    .filter((a) => /renew your policy|manage your payments|make a claim/i.test(a.textContent))
    .filter((a) => {
      const key = textOf(a);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (!links.length) return null;

  const ul = document.createElement('ul');
  links.forEach((a) => {
    const li = document.createElement('li');
    const na = document.createElement('a');
    na.setAttribute('href', a.getAttribute('href'));
    na.textContent = textOf(a);
    li.appendChild(na);
    ul.appendChild(li);
  });

  const iconP = document.createElement('p');
  iconP.textContent = token ? `:${token}:` : '';
  const mkP = (str) => { const p = document.createElement('p'); p.textContent = str; return p; };

  // One cell per model field GROUP: image, tag, title, text (link list)
  const cells = [
    [token ? fieldCell('image', iconP) : ''],
    [fieldCell('tag', mkP(tag))],
    [fieldCell('title', mkP(title))],
    [fieldCell('text', ul)],
  ];

  return WebImporter.Blocks.createBlock(document, { name: 'faq', cells });
}

export default function parse(element, { document }) {
  const titleEl = element.querySelector('.cmp-title__text, h1, h2, h3');
  const block = buildFaqBlock(titleEl, element, document);
  if (block) element.replaceWith(block);
}
