/**
 * Default no-op LLM adapter: never throws, empty-safe returns; keeps UI on stub paths.
 */

/**
 * @returns {import("./contract.js").SusoLlmAdapter}
 */
export function createNullSusoLlmAdapter() {
  return {
    complete() {
      try {
        return { text: "", done: true };
      } catch {
        return { text: "", done: true };
      }
    },
    classify() {
      try {
        return { label: null, scores: {} };
      } catch {
        return { label: null, scores: {} };
      }
    },
    embed() {
      try {
        return new Float32Array(0);
      } catch {
        return new Float32Array(0);
      }
    },
    summarize() {
      try {
        return "";
      } catch {
        return "";
      }
    },
  };
}
