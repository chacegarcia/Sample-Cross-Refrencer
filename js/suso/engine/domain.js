export const SUSO_ADAPTER_IDS_CONFIGURATOR = ["configurator", "document_query"];

export function susoClassifyDomainConfigurator(low, semantic, baseIntent) {
  if (baseIntent.insane) return "meta";
  const sem = semantic || {};
  if (baseIntent.action === "explain_invalid" || baseIntent.action === "ask_compatibility") return "configurator";
  if (baseIntent.action === "ask_options") return "configurator";
  if (sem.questionType === "why_question" && /\b(wool|foam|pad|form)\b/.test(low)) return "configurator";
  if (sem.intentTag === "export_bom" || baseIntent.action === "export_bom") return "configurator";
  if (
    sem.intentTag === "retrieve" &&
    (sem.attributes.length || sem.document) &&
    /\b(data|sheet|pdf|spec|part|material|pressure|temperature|dimension)\b/.test(low)
  ) {
    return "document_query";
  }
  if (
    (sem.questionType === "wh_question" || /\b(what|which)\b/.test(low)) &&
    (sem.attributes.length > 0 || /\b(pressure|temperature|dimension|material|part number|model number)\b/.test(low))
  ) {
    return "document_query";
  }
  return "configurator";
}

export function susoPickAdapterConfigurator(domain) {
  if (domain === "document_query") return { adapter: "document_query", rule: "domain_document_query" };
  return { adapter: "configurator", rule: "domain_configurator" };
}

export function susoListRejectedAdaptersConfigurator(chosen) {
  return SUSO_ADAPTER_IDS_CONFIGURATOR.filter((id) => id !== chosen).map((id) => ({
    adapter: id,
    reason: "not_selected:winner=" + chosen,
  }));
}
