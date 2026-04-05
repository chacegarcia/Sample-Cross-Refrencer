# `js/suso/` — Suso core (reusable)

**Stable surface:** NL engine, routing, phrase/semantic layers, adapter execution **contracts**, session store, LLM **interface** + null implementation.

- **`engine/`** — `interpretIntentRichConfigurator(text, deps)`; `deps` = `{ inferFieldsFromText, getCurrentMode }` (product supplies these from LCM).
- **`adapters/`** — Configurator adapter (export/reset/validate/set_fields/document_query) via `window.SUSO_ADAPTER_DEPS`.
- **`session/`** — Trace payload + optional session bucket (`bind-adapters.js`).
- **`llm/`** — `contract.js` + `null-adapter.js` (Phase C boundary); **not** TensorFlow — see `experimental/tfjs-gpt-lab/` for TF experiments.

**Extension points:** swap `window.SUSO_LLM_ADAPTER`, enrich `SUSO_DEPS` / `SUSO_ADAPTER_DEPS` without editing engine internals.
