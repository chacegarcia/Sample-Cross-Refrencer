/**
 * Ensures window.SUSO_LLM_ADAPTER exists (null adapter) unless the shell already set one.
 * Load after inline shell, before bind-adapters.js.
 */
import { createNullSusoLlmAdapter } from "./llm/null-adapter.js";

if (typeof window !== "undefined" && window.SUSO_LLM_ADAPTER == null) {
  window.SUSO_LLM_ADAPTER = createNullSusoLlmAdapter();
}
