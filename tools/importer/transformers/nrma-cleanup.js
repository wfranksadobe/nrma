/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: NRMA site-wide cleanup.
 *
 * Removes non-authorable global chrome and third-party widgets so the import
 * contains only page-level authorable content. All selectors below were
 * verified by reading migration-work/cleaned.html.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    WebImporter.DOMUtils.remove(element, [
      // Get-a-quote modal launched from the header (cleaned.html:5082)
      '.modal',
      '#mainNavGetAQuote-modal',
      // Nuance "Ask Nomi" chat widget + iframe (cleaned.html:5956-5958)
      '#nuanMessagingFrame',
      '#inqChatStage',
      '#nuance-fab-container',
      // Nuance chat resize/title chrome (cleaned.html:5965-5972)
      '#inqDivResizeCorner',
      '#inqResizeBox',
      '#inqTitleBar',
      '#nuanceDiv',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    WebImporter.DOMUtils.remove(element, [
      // Global header / megamenu — already migrated (cleaned.html:7-9)
      'header.megamenu',
      '.cmp-megamenu__top',
      // Global footer — already migrated (cleaned.html:4638)
      'footer.cmp-footer--generic-template',
      // Bot-protection / tracking leftovers after the footer (cleaned.html:5070-5081)
      '#sec-overlay',
      '[id^="batBeacon"]',
      // Non-authorable embedded elements / tracking pixels
      'iframe',
      'link',
      'script',
      'style',
      'noscript',
    ]);

    // Strip runtime-only attributes that are not authorable content.
    element.querySelectorAll('[data-inq-observer]').forEach((el) => {
      el.removeAttribute('data-inq-observer');
    });
  }
}
