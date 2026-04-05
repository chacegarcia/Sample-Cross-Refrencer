# LCM Sample Configurator

Static **HTML + ES modules** app: Excel-backed foam/wool BOM helper with a Suso NL assistant.

## Layout

| Path | Role |
|------|------|
| `index.html` | Host shell: DOM, auth/load, chat, `window.LCM_HOST`, script order |
| `js/suso/` | Reusable Suso **engine**, **adapters**, **session**, **LLM contract** (null adapter by default) |
| `js/lcm/` | **LCM product** logic: wizard, inference, catalog geometry, `wire.js` binds globals |
| `experimental/tfjs-gpt-lab/` | **Offline** TF.js transformer experiments — **not** used at runtime |

## Run locally

Serve the folder over HTTP (ES modules), e.g. `python3 -m http.server`, then open `index.html`.

## Scripts (main app)

1. Inline host + `LCM_HOST`
2. `js/lcm/wire.js` — product module globals + `window.SUSO_DEPS`
3. `js/suso/engine/bind.js` — `interpretIntentRichConfigurator`
4. `js/suso/bind-llm.js` — default `window.SUSO_LLM_ADAPTER`
5. `js/suso/bind-adapters.js` — `runConfiguratorAdapter`, session, trace

See `js/suso/README.md` and `js/lcm/README.md` for boundaries.
