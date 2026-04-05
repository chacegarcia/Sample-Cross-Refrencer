import { COL } from "../columns.js";
import { norm, normU, toNum, isTruthy } from "../form-state.js";

export function hnorm(s) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

let THK_COLS = [];
let THK_MAP = new Map();

export function buildThkMaps(geoRows) {
  THK_COLS = [];
  THK_MAP = new Map();
  if (!geoRows.length) return;

  for (const k of Object.keys(geoRows[0])) {
    if (hnorm(k).startsWith("THK_")) {
      const col = k.trim();
      THK_COLS.push(col);
      const suffix = col.trim().slice(4);
      const n = parseFloat(suffix);
      if (Number.isFinite(n)) THK_MAP.set(n, col);
    }
  }
  THK_COLS.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

export function thkBucketCol(thkVal) {
  const t = toNum(thkVal);
  if (t === null) return null;
  if (t < 0.875) return THK_MAP.get(0.875) || "THK_0.875";
  if (THK_MAP.has(t)) return THK_MAP.get(t);
  for (const [n, col] of THK_MAP.entries()) {
    if (Math.abs(n - t) < 1e-9) return col;
  }
  return null;
}

export function wheelsForThickness(geoRows, thkVal) {
  const col = thkBucketCol(thkVal);
  if (!col) return [];
  const wheels = new Set();
  for (const r of geoRows) {
    if (isTruthy(r[col])) {
      const w = norm(r[COL.geo_wheel]);
      if (w) wheels.add(w);
    }
  }
  return Array.from(wheels).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

/** Numeric thickness values (inches) that appear in geo for this wheel across THK_* columns. */
export function thicknessesForWheel(geoRows, wheelVal) {
  const w = normU(wheelVal);
  if (!geoRows.length || !THK_MAP.size) return [];
  const found = new Set();
  for (const r of geoRows) {
    if (normU(r[COL.geo_wheel]) !== w) continue;
    for (const [n, col] of THK_MAP.entries()) {
      if (isTruthy(r[col])) found.add(n);
    }
  }
  return Array.from(found).sort((a, b) => a - b);
}
