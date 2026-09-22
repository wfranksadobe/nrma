/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import cardsParser from './parsers/cards.js';
import columnsParser from './parsers/columns.js';
import promoParser from './parsers/promo.js';
import infoCardParser from './parsers/info-card.js';
import faqParser from './parsers/faq.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/nrma-cleanup.js';
import sectionsTransformer from './transformers/nrma-sections.js';

// PARSER REGISTRY
const parsers = {
  hero: heroParser,
  cards: cardsParser,
  columns: columnsParser,
  promo: promoParser,
  'info-card': infoCardParser,
  faq: faqParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'home',
  description: 'NRMA homepage — main content sections (nav + footer excluded).',
  urls: ['https://www.nrma.com.au/'],
  blocks: [
    // Top navy section → 2-column Promo + Cards (promo parser builds the whole
    // columns wrapper, so it consumes the section container directly).
    { name: 'promo', instances: ['.cmp-container--background-primary-colour'] },
    {
      name: 'cards',
      instances: [
        '.cmp-container--background-neutral-colour',      // product grid, why-choose, blog cards
      ],
    },
    {
      name: 'columns',
      instances: [
        '.cmp-container--background-neutral-colour',
        '.cmp-container--background-secondary-colour',
      ],
    },
  ],
  sections: [
    {
      id: 'sec1', name: 'Hero + promo offers',
      selector: ['.cmp-container--background-primary-colour'],
      style: '#010C66', blocks: ['hero', 'cards'], defaultContent: [],
    },
    {
      id: 'sec2', name: 'Insurance products + existing customers + why choose',
      selector: [
        '.cmp-container--background-neutral-colour.cmp-container--has-overlap:nth-of-type(2)',
        '.cmp-container--background-neutral-colour:nth-of-type(2)',
      ],
      style: '#F7F1EA', blocks: ['cards', 'columns'], defaultContent: [],
    },
    {
      id: 'sec3', name: 'Home loans band',
      selector: ['.cmp-container--background-secondary-colour'],
      style: '#D7D667', blocks: ['columns'], defaultContent: [],
    },
    {
      id: 'sec4', name: 'Blog cards + disclaimers',
      selector: [
        '.cmp-container--background-neutral-colour.cmp-container--has-overlap:nth-of-type(4)',
        '.cmp-container--background-neutral-colour:nth-of-type(4)',
      ],
      style: '#F7F1EA', blocks: ['cards'], defaultContent: [],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then sections (afterTransform)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook.
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all block instances on the page from the embedded template.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name, selector, element, section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2. discover blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. parse each block; skip elements already replaced by a prior parser
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform cleanup + section breaks/metadata
    executeTransformers('afterTransform', main, payload);

    // 5. built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. path — map the root/homepage URL to /index
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
