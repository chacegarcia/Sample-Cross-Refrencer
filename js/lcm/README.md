# `js/lcm/` — LCM product layer

Foam/wool **catalog** rules, **wizard** steps, **field inference**, apply/validate, BOM-adjacent helpers. Loaded via **`wire.js`** after `window.LCM_HOST` is set in `index.html`.

**`wire.js`** assigns globals (`recomputeFoam`, `getNextMissingSlot`, `susoInferFieldsFromText`, `window.COL`, etc.) expected by the shell.

**`sheet-parse.js`** — deliberate Excel parsing: normalizes header text, maps **aliases** → canonical keys (`columns.js`), picks sheets via **`LCM_SHEET_LAYOUT`**, and passes through extra geo columns (e.g. `THK_*`). Wire exposes **`window.lcmWorkbookToDb`**; the shell’s `workbookToDb()` delegates to it.

**Do not** import LCM from `js/suso/engine` — keep product rules here and inject through `SUSO_DEPS` / host.
