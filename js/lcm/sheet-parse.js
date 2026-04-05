/**
 * Deliberate Excel → row-object parsing for LCM catalogs.
 *
 * - Header cells: NBSP and whitespace normalized; matching is case-insensitive.
 * - Aliases map real sheet labels → canonical keys (COL / WOOL_COL / STACK_COL in columns.js).
 * - Geo sheet: maps core columns plus passthrough of extra headers (e.g. THK_* thickness flags).
 * - Sheet selection: `sheetIndex` and optional `nameIncludes` on `LCM_SHEET_LAYOUT`.
 *
 * When the production workbook lands, adjust aliases and/or `LCM_SHEET_LAYOUT` — not the whole app.
 */

import { COL, WOOL_COL, STACK_COL } from "./columns.js";

/** Normalize header text for comparison (not for row keys). */
export function hnormHeader(s) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function headerMatches(cellText, canonical, aliases) {
  const h = hnormHeader(cellText);
  if (!h) return false;
  if (h === hnormHeader(canonical)) return true;
  if (aliases) {
    for (const a of aliases) {
      if (h === hnormHeader(a)) return true;
    }
  }
  return false;
}

/** @typedef {{ canonical: string, aliases?: string[], required?: boolean }} ColumnSpec */

function foamColumnSpecs() {
  return [
    { canonical: COL.foam_color, aliases: ["FOAM COLOR", "FOAM COLOUR"], required: true },
    { canonical: COL.foam_part, aliases: ["PART NUMBER", "PART #", "PART NO", "PART NO.", "SKU"], required: true },
    { canonical: COL.foam_partColor, aliases: ["PART COLOR", "PART COLOUR"], required: true },
    { canonical: COL.foam_thickness, aliases: ["THK", "THICK", "THICKNESS IN"], required: true },
    { canonical: COL.foam_firmness, aliases: ["FIRM"], required: true },
  ];
}

function geoColumnSpecs() {
  return [
    { canonical: COL.geo_wheel, aliases: ["WHEEL SIZE"], required: true },
    { canonical: COL.geo_padSizes, aliases: ["PAD SIZE", "PADS", "PAD"], required: true },
    { canonical: COL.geo_grindDia, aliases: ["GRINDED LOOP DIA", "GRIND DIA", "LOOP DIA"], required: true },
  ];
}

function woolColumnSpecs() {
  return [
    {
      canonical: WOOL_COL.finalOd,
      aliases: ["FINAL O.D.", "FINAL OD (IN)", "PAD OD", "DIAMETER", "FINAL OUTSIDE DIA"],
      required: true,
    },
    { canonical: WOOL_COL.napLength, aliases: ["NAP", "NAP LEN"], required: true },
    { canonical: WOOL_COL.yarn, aliases: ["YARN TYPE"], required: true },
    { canonical: WOOL_COL.partNum, aliases: ["PART NUMBER", "PART #"], required: false },
    { canonical: WOOL_COL.opTuftedPadDia, aliases: ["OP TUFTED DIA", "TUFTED PAD DIA"], required: false },
    { canonical: WOOL_COL.substrateType, aliases: ["SUBSTRATE"], required: false },
    { canonical: WOOL_COL.substrateSize, aliases: [], required: false },
    { canonical: WOOL_COL.substratePart, aliases: [], required: false },
  ];
}

function stackColumnSpecs() {
  return [
    { canonical: STACK_COL.polyDia, aliases: ["POLY DIAMETER", "DIA"], required: true },
    { canonical: STACK_COL.polyType, aliases: [], required: false },
    { canonical: STACK_COL.polySizeMil, aliases: ["MIL", "POLY MIL"], required: false },
    { canonical: STACK_COL.backingSize, aliases: [], required: false },
    { canonical: STACK_COL.loop, aliases: [], required: false },
    { canonical: STACK_COL.canvas, aliases: [], required: false },
    { canonical: STACK_COL.polyPart, aliases: [], required: false },
  ];
}

/**
 * Which physical sheet to read. Use `nameIncludes` to match a tab name (case-insensitive substring)
 * when the real workbook order differs from the test compile.
 *
 * @type {{
 *   foam: { sheetIndex: number, nameIncludes: string | null },
 *   geo: { sheetIndex: number, nameIncludes: string | null },
 *   wool: { sheetIndex: number, nameIncludes: string | null },
 *   stack: { sheetIndex: number, nameIncludes: string | null },
 * }}
 */
export const LCM_SHEET_LAYOUT = {
  foam: { sheetIndex: 0, nameIncludes: null },
  geo: { sheetIndex: 1, nameIncludes: null },
  wool: { sheetIndex: 2, nameIncludes: null },
  stack: { sheetIndex: 3, nameIncludes: null },
};

function getXLSX() {
  if (typeof XLSX === "undefined") {
    throw new Error("XLSX is not loaded (include SheetJS before LCM modules).");
  }
  return XLSX;
}

function pickSheet(wb, layout) {
  const names = wb.SheetNames || [];
  if (layout.nameIncludes && String(layout.nameIncludes).trim()) {
    const needle = String(layout.nameIncludes).trim().toLowerCase();
    const hit = names.find((n) => n.toLowerCase().includes(needle));
    if (hit) return wb.Sheets[hit];
  }
  const i = layout.sheetIndex ?? 0;
  const name = names[i];
  if (!name) {
    throw new Error(`Workbook has no sheet at index ${i} (found ${names.length} sheet(s)).`);
  }
  return wb.Sheets[name];
}

/**
 * Per-column output keys: canonical for mapped specs; trimmed header for passthrough (e.g. THK_*).
 */
function buildColumnKeys(headers, specs) {
  const n = headers.length;
  const keys = new Array(n).fill(null);
  const used = new Set();

  for (const spec of specs) {
    let idx = -1;
    for (let c = 0; c < n; c++) {
      if (used.has(c)) continue;
      if (headerMatches(headers[c], spec.canonical, spec.aliases)) {
        idx = c;
        break;
      }
    }
    if (idx === -1) {
      if (spec.required) {
        return { ok: false, missing: spec.canonical };
      }
      continue;
    }
    used.add(idx);
    keys[idx] = spec.canonical;
  }

  for (let c = 0; c < n; c++) {
    if (keys[c]) continue;
    const raw = String(headers[c] ?? "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!raw || /^__EMPTY/i.test(raw)) continue;
    keys[c] = raw;
  }

  return { ok: true, keys };
}

function findHeaderRowAndKeys(aoa, specs, maxScan) {
  const limit = Math.min(maxScan, aoa.length);
  for (let i = 0; i < limit; i++) {
    const raw = (aoa[i] || []).map((v) =>
      String(v ?? "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
    const bk = buildColumnKeys(raw, specs);
    if (bk.ok) return { headerRowIdx: i, keys: bk.keys };
  }
  return null;
}

function rowsFromAoa(aoa, headerRowIdx, keys) {
  const out = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const obj = {};
    for (let c = 0; c < keys.length; c++) {
      const k = keys[c];
      if (!k) continue;
      obj[k] = row[c] ?? "";
    }
    if (Object.values(obj).some((v) => String(v ?? "").trim())) out.push(obj);
  }
  return out;
}

function parseSheet(ws, specs, options) {
  const XLSX = getXLSX();
  const maxScan = options?.maxScanRows ?? 50;
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const found = findHeaderRowAndKeys(aoa, specs, maxScan);
  if (!found) {
    const req = specs.filter((s) => s.required).map((s) => s.canonical);
    throw new Error(
      `Could not find a header row with required columns: ${req.join(", ")}. ` +
        `Adjust aliases in js/lcm/sheet-parse.js or LCM_SHEET_LAYOUT in the same file.`
    );
  }
  return rowsFromAoa(aoa, found.headerRowIdx, found.keys);
}

/**
 * Parse a loaded SheetJS workbook into the db shape used by `applyDbToApp`.
 * @param {object} wbIn SheetJS workbook
 */
export function lcmWorkbookToDb(wbIn) {
  const layout = LCM_SHEET_LAYOUT;
  const sFoam = pickSheet(wbIn, layout.foam);
  const sGeo = pickSheet(wbIn, layout.geo);
  const sWool = pickSheet(wbIn, layout.wool);
  const sStack = pickSheet(wbIn, layout.stack);

  const foam = parseSheet(sFoam, foamColumnSpecs(), {});
  const geo = parseSheet(sGeo, geoColumnSpecs(), {});
  const wool = parseSheet(sWool, woolColumnSpecs(), {});
  const stack = parseSheet(sStack, stackColumnSpecs(), {});

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    foamRows: foam,
    geoRows: geo,
    woolRows: wool,
    stackRows: stack,
  };
}
