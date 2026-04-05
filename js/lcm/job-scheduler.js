/**
 * Mock BOM / job lines and day-by-day scheduling (scheduler-local only).
 * Line contract: { partId, description, customer, qty, dueDate } with dueDate as YYYY-MM-DD.
 */

function parseISODate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? "").trim());
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localISO(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** @param {Date} [ref] defaults to now */
export function getScheduleToday(ref) {
  return startOfDay(ref instanceof Date ? ref : new Date());
}

/**
 * Mock shop orders for one calendar month (sample parts, qty, due dates).
 */
export const MOCK_BOM_MONTH = [
  { partId: "Z-FOAM-625-BLK", description: "Foam pad 0.625 Black UDO 6.5", customer: "Acme Retail", qty: 48, dueDate: "2026-04-04" },
  { partId: "Z-FOAM-875-GRY", description: "Foam pad 0.875 Grey 35° 5.75", customer: "Acme Retail", qty: 32, dueDate: "2026-04-05" },
  { partId: "W-TUFT-4-NAT", description: "Tufted wool 4\" OD / 0.75 nap / natural yarn", customer: "Lake Outfitters", qty: 24, dueDate: "2026-04-08" },
  { partId: "Z-FOAM-1250-YLW", description: "Foam pad 1.25 Yellow crosscut", customer: "Midwest Samples", qty: 60, dueDate: "2026-04-09" },
  { partId: "W-TUFT-55-LOOP", description: "Wool 5.5 OD white poly 28mil loop back", customer: "Lake Outfitters", qty: 16, dueDate: "2026-04-11" },
  { partId: "Z-FOAM-750-BLU", description: "Foam 0.75 Blue DURA wheel UDO", customer: "Coastal Labs", qty: 40, dueDate: "2026-04-12" },
  { partId: "Z-FOAM-MINI-ST2", description: "Foam MINI ST2 black MS2 tall", customer: "Acme Retail", qty: 20, dueDate: "2026-04-14" },
  { partId: "W-TUFT-6-CANV", description: "Wool 6\" OD canvas back / LC print", customer: "Showfloor Inc", qty: 12, dueDate: "2026-04-15" },
  { partId: "Z-FOAM-100-GRN", description: "Foam 1.0 Green REGI crosscut", customer: "Midwest Samples", qty: 72, dueDate: "2026-04-18" },
  { partId: "Z-FOAM-150-CHAR", description: "Foam 1.5 Charcoal Bulpren", customer: "Acme Retail", qty: 36, dueDate: "2026-04-18" },
  { partId: "W-TUFT-4-CUST", description: "Wool 4\" customer sample print", customer: "Private Label Co", qty: 8, dueDate: "2026-04-22" },
  { partId: "Z-FOAM-875-RED", description: "Foam 0.875 Red FR test wheel 35°", customer: "Coastal Labs", qty: 44, dueDate: "2026-04-24" },
  { partId: "Z-FOAM-500-BLK", description: "Foam 0.5 Black orbital blend", customer: "Midwest Samples", qty: 56, dueDate: "2026-04-25" },
  { partId: "W-TUFT-55-WHT", description: "Wool 5.5 OD white poly / no print", customer: "Lake Outfitters", qty: 28, dueDate: "2026-04-28" },
  { partId: "Z-FOAM-125-BLK", description: "Foam 1.25 Black MSW series", customer: "Acme Retail", qty: 52, dueDate: "2026-04-30" },
];

/**
 * On-time jobs: backward from due date; never schedule before `today`.
 * Late jobs (due &lt; today): forward from today (same shared capacity).
 *
 * @returns {{ entries: object[], overflows: object[], unitsPerDay: number, today: string }}
 */
export function buildDaySchedule(lines, opts) {
  const unitsPerDay = Math.max(1, Number(opts?.unitsPerDay) || 24);
  const today = opts?.today instanceof Date ? startOfDay(opts.today) : getScheduleToday();
  const todayStr = localISO(today);

  const dayUsed = new Map();
  const entries = [];
  const overflows = [];

  const valid = [];
  for (const line of lines) {
    const need0 = Math.max(0, Math.floor(Number(line.qty) || 0));
    if (!need0) continue;

    const due = parseISODate(line.dueDate);
    if (Number.isNaN(due.getTime())) {
      overflows.push({
        category: "bad_due_date",
        line,
        remaining: need0,
        detail: "dueDate must be YYYY-MM-DD",
      });
      continue;
    }
    valid.push({ ...line, _due: startOfDay(due), _need: need0 });
  }

  const onTime = valid.filter((x) => x._due >= today).sort((a, b) => {
    const t = a._due.getTime() - b._due.getTime();
    if (t !== 0) return t;
    return String(a.partId).localeCompare(String(b.partId));
  });

  const late = valid.filter((x) => x._due < today).sort((a, b) => {
    const t = a._due.getTime() - b._due.getTime();
    if (t !== 0) return t;
    return String(a.partId).localeCompare(String(b.partId));
  });

  for (const line of onTime) {
    allocateBackwardOnTime(line, today, dayUsed, entries, overflows, unitsPerDay);
  }
  for (const line of late) {
    allocateForwardLate(line, today, dayUsed, entries, overflows, unitsPerDay);
  }

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.partId.localeCompare(b.partId));
  return { entries, overflows, unitsPerDay, today: todayStr };
}

function allocateBackwardOnTime(line, today, dayUsed, entries, overflows, unitsPerDay) {
  let need = line._need;
  let d = new Date(line._due.getTime());
  let guard = 0;
  while (need > 0 && guard++ < 600) {
    if (d < today) {
      overflows.push({
        category: "impossible_before_due",
        line,
        remaining: need,
        detail:
          "Cannot meet due date: not enough spare capacity on or before due (and work cannot be scheduled before today).",
      });
      return;
    }
    const key = localISO(d);
    const used = dayUsed.get(key) || 0;
    const room = Math.max(0, unitsPerDay - used);
    const take = Math.min(need, room);
    if (take > 0) {
      entries.push({
        date: key,
        partId: line.partId,
        description: line.description,
        customer: line.customer || "",
        qty: take,
        dueDate: line.dueDate,
        late: false,
      });
      dayUsed.set(key, used + take);
      need -= take;
    }
    if (need > 0) {
      d = addDays(d, -1);
    }
  }
  if (need > 0) {
    overflows.push({
      category: "impossible_before_due",
      line,
      remaining: need,
      detail: "Scheduling stopped: exceeded iteration guard (split lines, raise daily capacity, or check data).",
    });
  }
}

function allocateForwardLate(line, today, dayUsed, entries, overflows, unitsPerDay) {
  let need = line._need;
  let d = new Date(today.getTime());
  let guard = 0;
  while (need > 0 && guard++ < 600) {
    const key = localISO(d);
    const used = dayUsed.get(key) || 0;
    const room = Math.max(0, unitsPerDay - used);
    const take = Math.min(need, room);
    if (take > 0) {
      entries.push({
        date: key,
        partId: line.partId,
        description: line.description,
        customer: line.customer || "",
        qty: take,
        dueDate: line.dueDate,
        late: true,
      });
      dayUsed.set(key, used + take);
      need -= take;
    }
    if (need > 0) {
      d = addDays(d, 1);
    }
  }
  if (need > 0) {
    overflows.push({
      category: "late_unscheduled",
      line,
      remaining: need,
      detail:
        "Past-due line: could not place all units starting from today (raise capacity or extend planning horizon).",
    });
  }
}

export function groupEntriesByDate(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date).push(e);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const OVERFLOW_LABELS = {
  bad_due_date: "Invalid due date",
  impossible_before_due: "Cannot meet due date (capacity / today floor)",
  late_unscheduled: "Past-due — not fully placed from today forward",
};

export function renderScheduleHtml(plan) {
  const { entries, overflows, unitsPerDay, today } = plan;
  const groups = groupEntriesByDate(entries);
  let html = `<p class="sched-meta">Schedule day: <strong>${esc(today)}</strong> · capacity: <strong>${unitsPerDay}</strong> parts/day (shared). On-time work books <strong>backward</strong> from due; <strong>past-due</strong> lines book <strong>forward</strong> from today.</p>`;

  if (!groups.length && !overflows.length) {
    html += `<p class="muted">No lines to schedule. Load mock data or import CSV.</p>`;
    return html;
  }

  html += `<div class="sched-days">`;
  for (const [date, rows] of groups) {
    const sub = rows.reduce((s, r) => s + r.qty, 0);
    html += `<div class="sched-day cardish"><div class="sched-day-hd"><strong>${esc(date)}</strong> <span class="muted">· ${sub} parts</span></div><ul>`;
    for (const r of rows) {
      const tag = r.late ? ` <span class="sched-late-tag">past due</span>` : "";
      html += `<li><span class="sched-qty">${r.qty}×</span> <code>${esc(r.partId)}</code> — ${esc(r.description)} <span class="muted">(${esc(r.customer)}) · due ${esc(r.dueDate)}</span>${tag}</li>`;
    }
    html += `</ul></div>`;
  }
  html += `</div>`;

  if (overflows.length) {
    html += `<div class="sched-warn cardish"><strong>Exceptions</strong><ul>`;
    for (const o of overflows) {
      const lab = OVERFLOW_LABELS[o.category] || o.category;
      html += `<li><strong>${esc(lab)}</strong> — <code>${esc(o.line?.partId)}</code>: ${esc(o.remaining)} units — ${esc(o.detail)}</li>`;
    }
    html += `</ul></div>`;
  }

  return html;
}

/** Escape one CSV field */
function csvField(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cols) {
  return cols.map(csvField).join(",");
}

/**
 * Flat CSV: scheduled rows, then ### OVERFLOWS ### section with category + detail.
 */
export function scheduleToCsv(plan) {
  const lines = [];
  lines.push("scheduleDate,partId,description,customer,qtyScheduled,originalDueDate");
  for (const e of plan.entries) {
    lines.push(csvRow([e.date, e.partId, e.description, e.customer, e.qty, e.dueDate]));
  }
  if (plan.overflows?.length) {
    lines.push("");
    lines.push("### OVERFLOWS ###");
    lines.push("overflowCategory,partId,description,customer,qtyRemaining,originalDueDate,detail");
    for (const o of plan.overflows) {
      const L = o.line || {};
      lines.push(
        csvRow([
          o.category,
          L.partId ?? "",
          L.description ?? "",
          L.customer ?? "",
          o.remaining,
          L.dueDate ?? "",
          o.detail ?? "",
        ])
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

/** Split CSV line with simple quoted-field support */
export function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normHeader(h) {
  return String(h ?? "")
    .replace(/\u00A0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * Import BOM lines from CSV text. Expected columns (header row): partId, description, customer, qty, dueDate
 * Aliases: part_id, due_date, etc.
 *
 * @returns {{ lines: object[], errors: string[] }}
 */
export function parseJobLinesFromCsv(text) {
  const errors = [];
  const lines = [];
  const raw = String(text ?? "").split(/\r?\n/).filter((ln) => ln.trim().length);
  if (!raw.length) {
    errors.push("Empty file.");
    return { lines, errors };
  }

  const headerCells = parseCsvLine(raw[0]);
  const hmap = {};
  const aliases = {
    partid: "partId",
    part: "partId",
    sku: "partId",
    description: "description",
    desc: "description",
    customer: "customer",
    qty: "qty",
    quantity: "qty",
    duedate: "dueDate",
    due: "dueDate",
    due_date: "dueDate",
  };

  headerCells.forEach((cell, i) => {
    const k = aliases[normHeader(cell)] || null;
    if (k) hmap[k] = i;
  });

  const need = ["partId", "qty", "dueDate"];
  for (const k of need) {
    if (hmap[k] === undefined) {
      errors.push(`Missing required column (need partId, qty, dueDate): could not map header row.`);
      return { lines, errors };
    }
  }
  if (hmap.description === undefined) hmap.description = -1;
  if (hmap.customer === undefined) hmap.customer = -1;

  for (let r = 1; r < raw.length; r++) {
    const cells = parseCsvLine(raw[r]);
    if (!cells.length || !cells.some((c) => c)) continue;

    const partId = cells[hmap.partId] ?? "";
    const qty = cells[hmap.qty] ?? "";
    const dueDate = cells[hmap.dueDate] ?? "";
    const description = hmap.description >= 0 ? cells[hmap.description] ?? "" : "";
    const customer = hmap.customer >= 0 ? cells[hmap.customer] ?? "" : "";

    if (!String(partId).trim()) {
      errors.push(`Row ${r + 1}: missing partId`);
      continue;
    }
    lines.push({
      partId: String(partId).trim(),
      description: String(description).trim(),
      customer: String(customer).trim(),
      qty: Number(String(qty).replace(/,/g, "")) || 0,
      dueDate: String(dueDate).trim(),
    });
  }

  if (!lines.length && !errors.length) errors.push("No data rows found.");
  return { lines, errors };
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

let activeLines = [];
let lastPlan = null;

export function initJobSchedulerPanel() {
  const tabConfig = document.getElementById("tabViewConfig");
  const tabSched = document.getElementById("tabViewSchedule");
  const viewConfig = document.getElementById("viewConfigurator");
  const viewSched = document.getElementById("viewScheduler");
  const unitsEl = document.getElementById("schedUnitsPerDay");
  const btnMock = document.getElementById("schedLoadMock");
  const btnBuild = document.getElementById("schedBuild");
  const btnExport = document.getElementById("schedExportCsv");
  const btnImport = document.getElementById("schedImportCsvBtn");
  const fileImport = document.getElementById("schedImportCsvFile");
  const bomEl = document.getElementById("schedBomPreview");
  const outEl = document.getElementById("schedDayPlan");

  if (!tabConfig || !viewConfig || !viewSched) return;

  function showConfig(show) {
    viewConfig.classList.toggle("hidden", !show);
    viewSched.classList.toggle("hidden", show);
    tabConfig.checked = show;
    tabSched.checked = !show;
  }

  document.querySelectorAll('input[name="appView"]').forEach((r) => {
    r.addEventListener("change", () => {
      if (!r.checked) return;
      showConfig(r.value === "config");
    });
  });

  function renderBomTable(lines) {
    if (!lines.length) {
      bomEl.innerHTML = `<p class="muted">No lines loaded.</p>`;
      return;
    }
    let t = `<table class="sched-table"><thead><tr><th>Due</th><th>Qty</th><th>Part</th><th>Description</th><th>Customer</th></tr></thead><tbody>`;
    for (const r of lines) {
      t += `<tr><td>${esc(r.dueDate)}</td><td>${esc(r.qty)}</td><td><code>${esc(r.partId)}</code></td><td>${esc(r.description)}</td><td>${esc(r.customer)}</td></tr>`;
    }
    t += `</tbody></table>`;
    bomEl.innerHTML = t;
  }

  function setExportEnabled(on) {
    if (btnExport) btnExport.disabled = !on;
  }

  btnMock?.addEventListener("click", () => {
    activeLines = MOCK_BOM_MONTH.map((r) => ({ ...r }));
    renderBomTable(activeLines);
    lastPlan = null;
    setExportEnabled(false);
    outEl.innerHTML = `<p class="muted">Mock BOM loaded (${activeLines.length} lines). Set capacity and click <strong>Build day-by-day plan</strong>.</p>`;
  });

  btnBuild?.addEventListener("click", () => {
    const units = Math.max(1, parseInt(unitsEl?.value || "24", 10) || 24);
    lastPlan = buildDaySchedule(activeLines, { unitsPerDay: units });
    outEl.innerHTML = renderScheduleHtml(lastPlan);
    setExportEnabled(!!(lastPlan.entries?.length || lastPlan.overflows?.length));
  });

  btnExport?.addEventListener("click", () => {
    if (!lastPlan) return;
    const csv = scheduleToCsv(lastPlan);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`lcm-schedule-${stamp}.csv`, csv, "text/csv;charset=utf-8");
  });

  btnImport?.addEventListener("click", () => fileImport?.click());

  fileImport?.addEventListener("change", async (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    const text = await f.text();
    const { lines, errors } = parseJobLinesFromCsv(text);
    if (errors.length && !lines.length) {
      outEl.innerHTML = `<div class="sched-warn cardish">${errors.map((e) => esc(e)).join("<br>")}</div>`;
      return;
    }
    activeLines = lines;
    renderBomTable(activeLines);
    lastPlan = null;
    setExportEnabled(false);
    let msg = `<p class="muted">Imported <strong>${lines.length}</strong> line(s). Set capacity and click <strong>Build</strong>.</p>`;
    if (errors.length) {
      msg += `<p class="muted" style="margin-top:8px;">Notes: ${esc(errors.join("; "))}</p>`;
    }
    outEl.innerHTML = msg;
  });

  showConfig(true);
  renderBomTable([]);
  setExportEnabled(false);
  outEl.innerHTML = `<p class="muted">Load the sample month or import CSV, then build the schedule.</p>`;
}
