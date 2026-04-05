/**
 * document_query path: stub text by default; optional LLM via deps.getLlmAdapter() when it returns non-empty text.
 * Phase C: null adapter yields empty complete() text → identical stub to pre–Phase C.
 */

/**
 * @param {object} routed
 * @returns {string}
 */
function buildStubText(routed) {
  const p = routed.payload || {};
  return (
    "Document / data-sheet Q&A is not wired yet. Recognized attributes: " +
    (p.attributes || []).join(", ") +
    ". " +
    (p.execution && p.execution.note ? p.execution.note : "")
  );
}

/**
 * @param {unknown} v
 * @returns {import("../llm/contract.js").LlmCompleteResult|null}
 */
function unwrapSyncComplete(v) {
  if (v == null) return null;
  if (typeof v.then === "function") return null;
  return v;
}

/**
 * @param {object} routed
 * @param {import("./types.js").ConfiguratorAdapterDeps} [deps]
 * @returns {{ text: string, executed: boolean, stub: boolean }}
 */
export function runDocumentQueryAdapter(routed, deps) {
  const stub = buildStubText(routed);

  let llmText = "";
  let getLlm = deps && deps.getLlmAdapter;
  if (typeof getLlm !== "function") {
    return { text: stub, executed: false, stub: true };
  }

  let adapter = null;
  try {
    adapter = getLlm();
  } catch {
    adapter = null;
  }
  if (!adapter || typeof adapter.complete !== "function") {
    return { text: stub, executed: false, stub: true };
  }

  try {
    const raw = adapter.complete({
      prompt: stub,
      context: routed,
      task: "document_query",
    });
    const r = unwrapSyncComplete(raw);
    if (r && typeof r.text === "string" && r.text.trim()) {
      llmText = r.text.trim();
    }
  } catch {
    // Never fail document_query; fall back to stub
  }

  if (llmText) {
    return { text: llmText, executed: false, stub: true };
  }

  return { text: stub, executed: false, stub: true };
}
