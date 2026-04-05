/**
 * Stable Suso LLM boundary (Phase C: contract + injection only; no providers here).
 * Implementations may become async in Phase D; callers should handle Promises when added.
 */

/**
 * @typedef {object} LlmCompleteArgs
 * @property {string} [prompt]
 * @property {unknown} [context]
 * @property {string} [task]
 */

/**
 * @typedef {object} LlmCompleteResult
 * @property {string} [text]
 * @property {boolean} [done]
 */

/**
 * @typedef {object} LlmClassifyArgs
 * @property {string} input
 * @property {string[]} labels
 * @property {unknown} [context]
 */

/**
 * @typedef {object} LlmClassifyResult
 * @property {string|null} [label]
 * @property {Record<string, number>} [scores]
 */

/**
 * Language/model adapter surface for future augmentation (classification, RAG, summarization).
 * @typedef {object} SusoLlmAdapter
 * @property {(args: LlmCompleteArgs) => (LlmCompleteResult|Promise<LlmCompleteResult>)} complete
 * @property {(args: LlmClassifyArgs) => (LlmClassifyResult|Promise<LlmClassifyResult>)} classify
 * @property {(text: string) => (Float32Array|number[]|Promise<Float32Array|number[]>)} embed
 * @property {(input: string, context?: unknown) => (string|Promise<string>)} summarize
 */

export {};
