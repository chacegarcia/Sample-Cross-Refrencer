import { susoPickAdapterConfigurator } from "./domain.js";
import { susoNormalizeConfiguratorRequest } from "./intent-shell.js";

/**
 * @param {object} deps — injected LCM/runtime hooks (not part of pure phrase/domain stack).
 * @param {function} deps.inferFieldsFromText
 * @param {function} deps.getCurrentMode
 */
export function susoRouteConfiguratorInterpretation(intent, text, low, trace, deps) {
  if (!deps || typeof deps.inferFieldsFromText !== "function" || typeof deps.getCurrentMode !== "function") {
    throw new Error("susoRouteConfiguratorInterpretation requires deps: { inferFieldsFromText, getCurrentMode }");
  }
  const sem = intent.semantic || {};
  const pick = susoPickAdapterConfigurator(intent._suso.domain);
  const adapter = pick.adapter;

  if (adapter === "document_query") {
    const payload = {
      raw: text,
      questionType: sem.questionType,
      attributes: sem.attributes.slice ? sem.attributes.slice() : [],
      document: sem.document || null,
      execution: { stub: true, note: "Wire workbook / data-sheet resolver (Excel graph, embeddings, or RAG)." },
    };
    const routed = susoNormalizeConfiguratorRequest(adapter, "document_query", intent._suso.domain, pick.rule, payload);
    trace.push({ t: "routing", adapter, kind: routed.kind, rule: pick.rule, domain: intent._suso.domain });
    return routed;
  }

  const base = intent;
  if (base.action === "export_bom") {
    const routed = susoNormalizeConfiguratorRequest("configurator", "export_bom", intent._suso.domain, "intent_export", { raw: text });
    trace.push({ t: "routing", adapter: "configurator", kind: "export_bom", rule: "intent_export" });
    return routed;
  }
  if (base.action === "reset_form") {
    const routed = susoNormalizeConfiguratorRequest("configurator", "reset_form", intent._suso.domain, "intent_reset", { raw: text });
    trace.push({ t: "routing", adapter: "configurator", kind: "reset_form", rule: "intent_reset" });
    return routed;
  }
  if (base.action === "explain_invalid") {
    const routed = susoNormalizeConfiguratorRequest("configurator", "explain_invalid_state", intent._suso.domain, "why_invalid", {
      raw: text,
      modeHint: deps.getCurrentMode(),
    });
    trace.push({ t: "routing", adapter: "configurator", kind: "explain_invalid_state", rule: "why_invalid" });
    return routed;
  }
  if (base.action === "validate") {
    const routed = susoNormalizeConfiguratorRequest("configurator", "validate_form", intent._suso.domain, "validate", { raw: text });
    trace.push({ t: "routing", adapter: "configurator", kind: "validate_form", rule: "validate" });
    return routed;
  }
  if (base.action === "ask_options") {
    let topic = "unknown";
    if (/\bwheel/.test(low)) topic = "foam_wheel_sizes";
    const routed = susoNormalizeConfiguratorRequest("configurator", "ask_options", intent._suso.domain, "options_question", { raw: text, topic });
    trace.push({ t: "routing", adapter: "configurator", kind: "ask_options", rule: "options_question", topic });
    return routed;
  }
  if (base.action === "ask_compatibility") {
    const routed = susoNormalizeConfiguratorRequest("configurator", "ask_compatibility", intent._suso.domain, "compatibility_question", { raw: text });
    trace.push({ t: "routing", adapter: "configurator", kind: "ask_compatibility", rule: "compatibility_question" });
    return routed;
  }

  const inferred = deps.inferFieldsFromText(low, text, sem, intent._phraseMatches || []);
  const payload = {
    raw: text,
    fields: inferred.fields,
    inferenceNotes: inferred.notes,
    clarifications: inferred.clarifications,
    confirmations: inferred.confirmations || [],
    confidence: inferred.clarifications.length ? "partial" : "high",
  };
  const routed = susoNormalizeConfiguratorRequest("configurator", "set_fields", intent._suso.domain, "fill_partial", payload);
  trace.push({ t: "routing", adapter: "configurator", kind: "set_fields", rule: "fill_partial", confidence: payload.confidence });
  return routed;
}
