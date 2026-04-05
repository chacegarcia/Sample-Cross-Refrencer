/**
 * GPT-style causal LM (TensorFlow.js) — token + position embeddings, multi-head
 * self-attention (causal mask), FFN (GELU), layer norm, LM head. Trains with Adam
 * on next-token (shifted) labels.
 *
 * Attention is implemented as a custom `tf.layers.Layer` so Q/K/V matmuls and
 * masks run inside `call()` with real tensors (the Layers executor never runs
 * raw `tf.reshape` / `tf.matMul` on SymbolicTensors during graph wiring).
 *
 * Preset `gpt_small_100m`: 12×768, 12 heads, vocab 8192, seq 512 (~100M+ params).
 * TF.js has no built-in autocast FP16 or activation checkpointing like PyTorch.
 */

import * as tf from "@tensorflow/tfjs";

/** @extends {tf.layers.Layer} */
class CausalSelfAttentionLayer extends tf.layers.Layer {
  static className = "CausalSelfAttentionLayer";

  /**
   * @param {object} args
   * @param {number} args.numHeads
   * @param {number} args.keyDim
   * @param {number} args.seqLen
   * @param {string} [args.name]
   */
  constructor(args) {
    super({ name: args.name, trainable: args.trainable });
    this.numHeads = args.numHeads;
    this.keyDim = args.keyDim;
    this.seqLen = args.seqLen;
  }

  build(inputShape) {
    const E = inputShape[inputShape.length - 1];
    this.embedDim = E;
    const d = (name) =>
      tf.layers.dense({
        units: E,
        name: `${this.name}/${name}`,
        kernelInitializer: "glorotNormal",
      });
    this.q = d("q");
    this.k = d("k");
    this.v = d("v");
    this.out = d("out");
    this.q.build(inputShape);
    this.k.build(inputShape);
    this.v.build(inputShape);
    this.out.build(inputShape);
  }

  computeOutputShape(inputShape) {
    return inputShape;
  }

  call(inputs) {
    const x = Array.isArray(inputs) ? inputs[0] : inputs;
    const T = this.seqLen;
    const H = this.numHeads;
    const D = this.keyDim;
    const E = this.embedDim;

    return tf.tidy(() => {
      const q = this.q.apply(x);
      const k = this.k.apply(x);
      const v = this.v.apply(x);

      const q4 = tf.transpose(tf.reshape(q, [-1, T, H, D]), [0, 2, 1, 3]);
      const k4 = tf.transpose(tf.reshape(k, [-1, T, H, D]), [0, 2, 1, 3]);
      const v4 = tf.transpose(tf.reshape(v, [-1, T, H, D]), [0, 2, 1, 3]);

      const kt = tf.transpose(k4, [0, 1, 3, 2]);
      let scores = tf.matMul(q4, kt);
      scores = tf.div(scores, tf.sqrt(tf.scalar(D)));

      const ones = tf.ones([T, T], scores.dtype);
      const lower = tf.linalg.bandPart(ones, -1, 0);
      const negMask = tf.mul(tf.sub(tf.scalar(1, scores.dtype), lower), tf.scalar(-1e9));
      scores = tf.add(scores, tf.reshape(negMask, [1, 1, T, T]));

      const attn = tf.softmax(scores, -1);
      const ctx = tf.matMul(attn, v4);
      const merged = tf.reshape(tf.transpose(ctx, [0, 2, 1, 3]), [-1, T, E]);
      return this.out.apply(merged);
    });
  }

  getClassName() {
    return "CausalSelfAttentionLayer";
  }

  getConfig() {
    const base = super.getConfig();
    return Object.assign({}, base, {
      numHeads: this.numHeads,
      keyDim: this.keyDim,
      seqLen: this.seqLen,
    });
  }

  static fromConfig(cls, config) {
    return new cls(config);
  }
}

tf.serialization.registerClass(CausalSelfAttentionLayer);

function gptBlock(x, layers) {
  const ln1 = layers.ln1.apply(x);
  const attnOut = layers.attn.apply(ln1);

  let h = tf.layers.add().apply([x, attnOut]);
  const ln2 = layers.ln2.apply(h);
  const ff = layers.ff2.apply(layers.ff1.apply(ln2));
  h = tf.layers.add().apply([h, ff]);
  return h;
}

/**
 * @param {object} config
 * @param {number} config.vocabSize
 * @param {number} config.seqLen
 * @param {number} [config.nLayer=12]
 * @param {number} [config.nHead=12]
 * @param {number} [config.nEmbd=768]
 * @param {number} [config.nInner=3072]
 */
export function buildGPTModel(config) {
  const {
    vocabSize,
    seqLen,
    nLayer = 12,
    nHead = 12,
    nEmbd = 768,
    nInner = 3072,
  } = config;

  if (nEmbd % nHead !== 0) throw new Error("nEmbd must be divisible by nHead");

  const keyDim = nEmbd / nHead;

  const tokenIn = tf.input({ shape: [seqLen], dtype: "int32", name: "tokens" });
  const posIn = tf.input({ shape: [seqLen], dtype: "int32", name: "positions" });

  const wte = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: nEmbd,
    embeddingsInitializer: "glorotNormal",
    name: "wte",
  });
  const wpe = tf.layers.embedding({
    inputDim: seqLen,
    outputDim: nEmbd,
    embeddingsInitializer: "glorotNormal",
    name: "wpe",
  });

  let h = tf.layers.add().apply([wte.apply(tokenIn), wpe.apply(posIn)]);

  const blocks = [];
  for (let i = 0; i < nLayer; i++) {
    const p = `h${i}`;
    blocks.push({
      ln1: tf.layers.layerNormalization({ epsilon: 1e-5, name: `${p}/ln1` }),
      attn: new CausalSelfAttentionLayer({
        numHeads: nHead,
        keyDim,
        seqLen,
        name: `${p}/attn`,
      }),
      ln2: tf.layers.layerNormalization({ epsilon: 1e-5, name: `${p}/ln2` }),
      ff1: tf.layers.dense({
        units: nInner,
        activation: "gelu",
        name: `${p}/ff1`,
        kernelInitializer: "glorotNormal",
      }),
      ff2: tf.layers.dense({
        units: nEmbd,
        name: `${p}/ff2`,
        kernelInitializer: "glorotNormal",
      }),
    });
  }

  for (let i = 0; i < nLayer; i++) {
    h = gptBlock(h, blocks[i]);
  }

  const lnF = tf.layers.layerNormalization({ epsilon: 1e-5, name: "ln_f" }).apply(h);
  const lmHead = tf.layers
    .dense({
      units: vocabSize,
      useBias: false,
      name: "lm_head",
      kernelInitializer: "glorotNormal",
    })
    .apply(lnF);

  return tf.model({ inputs: [tokenIn, posIn], outputs: lmHead, name: "gpt_causal" });
}

export function causalAttentionBias(seqLen) {
  return tf.tidy(() => {
    const i = tf.reshape(tf.range(0, seqLen, 1, "float32"), [seqLen, 1]);
    const j = tf.reshape(tf.range(0, seqLen, 1, "float32"), [1, seqLen]);
    const allowed = tf.lessEqual(j, i);
    return tf.sub(tf.cast(allowed, "float32"), tf.mul(tf.cast(tf.logicalNot(allowed), "float32"), 1e9));
  });
}

export function positionIds(seqLen) {
  return tf.tidy(() => tf.reshape(tf.range(0, seqLen, 1, "int32"), [1, seqLen]));
}

export async function countTrainableParams(model) {
  let n = 0;
  for (const w of model.weights) n += w.shape.reduce((a, b) => a * b, 1);
  return n;
}

export const GPT_PRESETS = {
  /** ~100M+ params: large token embedding table + 12×768×12 GPT block */
  gpt_small_100m: {
    vocabSize: 56000,
    seqLen: 512,
    nLayer: 12,
    nHead: 12,
    nEmbd: 768,
    nInner: 3072,
  },
  tiny: {
    vocabSize: 256,
    seqLen: 32,
    nLayer: 2,
    nHead: 4,
    nEmbd: 128,
    nInner: 512,
  },
};

export { tf };
