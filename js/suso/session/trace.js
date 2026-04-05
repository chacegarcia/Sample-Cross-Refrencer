/**
 * Trace payload for Suso debug panel (same shape as prior inline object).
 */
export function buildSusoTraceOut(rich, exec) {
  return {
    phraseMatches: (rich._phraseMatches || []).map((m) => ({
      phrase: m.phrase,
      category: m.category,
      canonical: m.canonical,
      pack: m.pack,
    })),
    semanticSlots: rich.semantic,
    domain: rich._suso.domain,
    adapter: rich.routed.adapter,
    rule: rich.routed.rule,
    finalRequest: rich.routed,
    execution: exec,
    fullTrace: rich.intentTrace,
  };
}
