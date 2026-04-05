# TF.js GPT lab (experimental)

**Frozen / offline:** Node-only experiments for a small GPT-style transformer. **Not imported** by `index.html` or `js/suso/` (the app’s `js/suso/llm/` folder is a separate, null-safe **contract** layer).

## Setup

```bash
cd experimental/tfjs-gpt-lab
npm install
npm run train
# optional: npm run train:full   # high RAM
```

Requires Node; optional CUDA packages per `package.json` optionalDependencies.

**Do not** treat this as production inference for the LCM app.
