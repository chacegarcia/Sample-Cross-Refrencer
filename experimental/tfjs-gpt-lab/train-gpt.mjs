/**
 * Next-token training smoke test (Adam) for GPT (TF.js).
 *
 * Usage:
 *   node train-gpt.mjs                 # tiny preset, forward + one backward step
 *   node train-gpt.mjs --preset=full   # ~100M+ param graph (high RAM)
 *
 * Optional: `npm install @tensorflow/tfjs-node-gpu` in a path without spaces, then
 * set backend before importing tf (see TF.js Node GPU docs). True FP16 autocast
 * and gradient checkpointing are not available in TF.js like PyTorch.
 */

import * as tf from "@tensorflow/tfjs";
import {
  buildGPTModel,
  positionIds,
  countTrainableParams,
  GPT_PRESETS,
} from "./gpt-transformer.mjs";

function nextTokenLoss(model, tokens, pos) {
  return tf.tidy(() => {
    const out = model.apply([tokens, pos]);
    const shape = out.shape;
    const B = shape[0];
    const T = shape[1];
    const V = shape[2];
    const logits = tf.slice(out, [0, 0, 0], [B, T - 1, V]);
    const targets = tf.slice(tokens, [0, 1], [B, T - 1]);
    const flat = tf.cast(tf.reshape(targets, [-1]), "int32");
    const oneHot = tf.oneHot(flat, V);
    const logitsFlat = tf.reshape(logits, [-1, V]);
    return tf.losses.softmaxCrossEntropy(
      oneHot,
      logitsFlat,
      undefined,
      0,
      tf.Reduction.MEAN
    );
  });
}

async function runSmoke() {
  const preset = process.argv.includes("--preset=full")
    ? GPT_PRESETS.gpt_small_100m
    : GPT_PRESETS.tiny;

  console.log("Building model with config:", preset);
  const model = buildGPTModel(preset);
  const n = await countTrainableParams(model);
  console.log("Trainable parameters (~):", n.toLocaleString());

  const { vocabSize, seqLen } = preset;
  const batch = 2;
  const tokens = tf.randomUniformInt([batch, seqLen], 0, vocabSize, "int32");
  const pos = tf.tile(positionIds(seqLen), [batch, 1]);

  const logits = model.apply([tokens, pos]);
  if (preset === GPT_PRESETS.tiny) {
    logits.print();
  } else {
    console.log("Logits shape:", logits.shape);
  }

  const lossVal = nextTokenLoss(model, tokens, pos);
  console.log("Example batch loss (random data):");
  lossVal.print();

  const lossFn = () => nextTokenLoss(model, tokens, pos);
  const trainableVars = model.trainableWeights.map((w) => w.read());
  const grads = tf.variableGrads(lossFn, trainableVars);
  console.log(
    "Gradients computed for",
    Object.keys(grads.grads).length,
    "trainable tensors"
  );

  const optimizer = tf.train.adam(3e-4);
  optimizer.minimize(lossFn, false, trainableVars);
  optimizer.dispose();

  tokens.dispose();
  pos.dispose();
  lossVal.dispose();
  logits.dispose();
  Object.values(grads.grads).forEach((g) => g.dispose());
  model.dispose();
  console.log("Smoke test OK.");
}

runSmoke().catch((e) => {
  console.error(e);
  process.exit(1);
});
