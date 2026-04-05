/**
 * Mutable session bucket for Suso wizard / undo (no persistence).
 * Instantiated once in bind-adapters.js as window.SusoSession.
 */
export function createSusoSessionStore() {
  return {
    /** @type {string|null} */
    awaitingStep: null,
    /** @type {object|null} */
    undoSnapshot: null,
  };
}
