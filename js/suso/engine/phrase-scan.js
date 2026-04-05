/** Future Excel / data-sheet attributes (shared document phrase pack). */
export const SUSO_PHRASE_PACK_DOCUMENT = [
  { phrase: "pressure rating", category: "attribute", canonical: "pressure rating", pack: "document" },
  { phrase: "operating temperature", category: "attribute", canonical: "operating temperature", pack: "document" },
  { phrase: "tensile strength", category: "attribute", canonical: "tensile strength", pack: "document" },
  { phrase: "hardness", category: "attribute", canonical: "hardness", pack: "document" },
  { phrase: "dimensions", category: "attribute", canonical: "dimensions", pack: "document" },
  { phrase: "chemical resistance", category: "attribute", canonical: "chemical resistance", pack: "document" },
  { phrase: "part number", category: "attribute", canonical: "part number", pack: "document" },
  { phrase: "model number", category: "attribute", canonical: "model number", pack: "document" },
  { phrase: "material", category: "attribute", canonical: "material", pack: "document" },
  { phrase: "data sheet", category: "document", canonical: "data sheet", pack: "document" },
  { phrase: "spec sheet", category: "document", canonical: "spec sheet", pack: "document" },
  { phrase: "msds", category: "document", canonical: "msds", pack: "document" },
];

/** Configurator-specific multi-word concepts → semantic categories. */
export const SUSO_PHRASE_PACK_CONFIGURATOR = [
  { phrase: "foam pad", category: "product_type", canonical: "foam", pack: "lcm" },
  { phrase: "tufted wool", category: "product_type", canonical: "wool", pack: "lcm" },
  { phrase: "wool pad", category: "product_type", canonical: "wool", pack: "lcm" },
  { phrase: "white loop", category: "loop_type", canonical: "White Loop", pack: "lcm" },
  { phrase: "black loop", category: "loop_type", canonical: "Black Loop", pack: "lcm" },
  { phrase: "no loop", category: "loop_type", canonical: "No Loop", pack: "lcm" },
  { phrase: "with hole", category: "finished_pad", canonical: "With Hole", pack: "lcm" },
  { phrase: "no hole", category: "finished_pad", canonical: "No Hole", pack: "lcm" },
  { phrase: "finished pad", category: "field", canonical: "foamHole", pack: "lcm" },
  { phrase: "loop type", category: "field", canonical: "foamLoopType", pack: "lcm" },
  { phrase: "pad size", category: "field", canonical: "foamPadSize", pack: "lcm" },
  { phrase: "final od", category: "field", canonical: "woolPadSize", pack: "lcm" },
  { phrase: "nap length", category: "field", canonical: "woolNap", pack: "lcm" },
  { phrase: "backing type", category: "field", canonical: "woolBacking", pack: "lcm" },
  { phrase: "poly type", category: "field", canonical: "woolPoly", pack: "lcm" },
  { phrase: "sturdyness", category: "field", canonical: "woolMil", pack: "lcm" },
  { phrase: "mil", category: "field", canonical: "woolMil", pack: "lcm" },
  { phrase: "my custom print", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "customer sample print", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "custom print", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "custom artwork", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "my logo", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "our logo", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "customer logo", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "their logo", category: "print_type", canonical: "Customer Sample Print", pack: "lcm" },
  { phrase: "lc print", category: "print_type", canonical: "LC Print", pack: "lcm" },
  { phrase: "no print", category: "print_type", canonical: "No Print", pack: "lcm" },
  { phrase: "curved", category: "orientation", canonical: "Curved", pack: "lcm" },
  { phrase: "flat", category: "orientation", canonical: "Flat", pack: "lcm" },
  { phrase: "requested by", category: "field", canonical: "reqName", pack: "lcm" },
  { phrase: "sample name", category: "field", canonical: "sampleName", pack: "lcm" },
  { phrase: "bill of materials", category: "intent", canonical: "export_bom", pack: "lcm" },
  { phrase: "bom export", category: "intent", canonical: "export_bom", pack: "lcm" },
  { phrase: "grind dia", category: "concept", canonical: "grinded_loop_dia", pack: "lcm" },
  { phrase: "grinded loop", category: "concept", canonical: "grinded_loop_dia", pack: "lcm" },
  { phrase: "wheel size", category: "concept", canonical: "wheel", pack: "lcm" },
  { phrase: "foam color", category: "field", canonical: "foamColor", pack: "lcm" },
  { phrase: "foam thickness", category: "field", canonical: "foamThickness", pack: "lcm" },
];

export function susoWordishBoundaryOk(low, start, len) {
  if (start < 0 || len < 1 || start + len > low.length) return false;
  const before = start > 0 ? low[start - 1] : " ";
  const after = start + len < low.length ? low[start + len] : " ";
  if (/[a-z0-9]/.test(before)) return false;
  if (/[a-z0-9]/.test(after)) return false;
  return true;
}

export function susoPhraseEntriesForConfigurator() {
  const rows = [];
  for (const row of SUSO_PHRASE_PACK_DOCUMENT) {
    const ph = String(row.phrase || "").toLowerCase().trim();
    if (!ph) continue;
    rows.push({
      phrase: ph,
      category: row.category || "concept",
      canonical: row.canonical !== undefined ? row.canonical : null,
      pack: row.pack || "document",
    });
  }
  for (const row of SUSO_PHRASE_PACK_CONFIGURATOR) {
    const ph = String(row.phrase || "").toLowerCase().trim();
    if (!ph) continue;
    rows.push({
      phrase: ph,
      category: row.category || "concept",
      canonical: row.canonical !== undefined ? row.canonical : null,
      pack: row.pack || "lcm",
    });
  }
  rows.sort((a, b) => b.phrase.length - a.phrase.length || String(a.phrase).localeCompare(String(b.phrase)));
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = r.phrase + "\0" + r.category + "\0" + (r.canonical || "");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function susoCollectPhraseMatches(low) {
  if (!low) return [];
  const phrases = susoPhraseEntriesForConfigurator();
  const out = [];
  let i = 0;
  while (i < low.length) {
    if (/\s/.test(low[i])) {
      i++;
      continue;
    }
    let best = null;
    for (const p of phrases) {
      const plen = p.phrase.length;
      if (plen > low.length - i) continue;
      if (low.slice(i, i + plen) !== p.phrase) continue;
      if (!susoWordishBoundaryOk(low, i, plen)) continue;
      best = p;
      break;
    }
    if (best) {
      out.push(Object.assign({}, best, { start: i, end: i + best.phrase.length }));
      i += best.phrase.length;
    } else {
      i++;
    }
  }
  return out;
}
