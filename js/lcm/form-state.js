export function norm(v) {
  return String(v ?? "").replace(/\u00A0/g, " ").trim();
}
export function normU(v) {
  return norm(v).toUpperCase();
}
export function toNum(v) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}
/** Matches legacy sheet flags (Loop/Canvas columns, etc.). */
export function isTruthy(v) {
  const s = normU(v);
  return s === "Y" || s === "YES" || s === "1" || s === "TRUE" || s === "T";
}
export function susoNormalizeNumericText(s) {
  return String(s || "").replace(/\b(\d+),(\d+)\b/g, "$1.$2");
}
export function susoSanitizeForBoldEcho(s) {
  return String(s).replace(/\*+/g, "");
}
export function uniqSorted(rows, colName) {
  const vals = rows.map((r) => norm(r[colName])).filter(Boolean);
  return [...new Set(vals)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}
export function splitMaybeComma(v) {
  return String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
export function uniq(arr) {
  return [...new Set(arr.filter((v) => norm(v)))];
}
export function pickMatchingOption(want, options) {
  if (!want || !options || !options.length) return null;
  const wu = normU(want);
  const exact = options.find((o) => normU(o) === wu);
  if (exact) return exact;
  const substr = options.find((o) => wu.includes(normU(o)) || normU(o).includes(wu));
  if (substr) return substr;
  return null;
}
