import * as tf from '@tensorflow/tfjs-node'
import { getAppDataPath } from 'common/utils'
import fs from 'fs'
import path from 'path'

export class FullyConnected {
  _clf: any
  constructor(private _nb_intent: number, private _embed_size: number) {
    this._clf = tf.sequential()
    this._clf.add(tf.layers.inputLayer({ inputShape: [_embed_size] }))
    this._clf.add(tf.layers.dense({ units: _embed_size, useBias: true }))
    this._clf.add(tf.layers.leakyReLU())
    this._clf.add(tf.layers.dropout({ rate: 0.4 }))
    this._clf.add(tf.layers.dense({ units: _nb_intent, useBias: true }))

    this._clf.compile({
      optimizer: tf.train.adam(0.0001),
      loss: tf.losses.softmaxCrossEntropy,
      metrics: ['accuracy']
    })
    // console.log(this._clf.summary())
  }

  async train(X: number[][], y: number[], force_train = false): Promise<void> {
    if (
      fs.existsSync(
        path.join(getAppDataPath(), 'cache', 'deep_models', 'intentizers', 'FullyConnected', 'model.bin')
      ) ||
      !force_train
    ) {
      this.load()
    } else {
      await this._clf.fit(tf.tensor2d(X), tf.oneHot(tf.tensor1d(y, 'int32'), this._nb_intent), {
        batchSize: 512,
        epochs: 200,
        validationSplit: 0.1,
        verbose: 0,
        shuffle: true,
        callbacks: tf.callbacks.earlyStopping({ monitor: 'val_acc', patience: 20, minDelta: 0.0001 })
      })
      this.save()
    }
  }

  async predict(embeded_sentence: number[]): Promise<[number, number, number[][]]> {
    const tens: tf.Tensor = tf.tensor1d(embeded_sentence).reshape([1, this._embed_size])
    const probs: tf.Tensor = this._clf.predict(tens).reshape([this._nb_intent])
    const { values, indices } = tf.topk(probs, 3, true)
    const top_k_values = Array.from(values.dataSync())
    const top_k_indices = Array.from(indices.dataSync())
    const top_k: number[][] = top_k_indices.map((e, i) => [e, top_k_values[i]])
    const pred: tf.Tensor = tf.argMax(probs)
    const proba: tf.Tensor = tf.max(probs)
    return [pred.dataSync()[0], proba.dataSync()[0], top_k]
  }

  save() {
    this._clf.save(path.join(getAppDataPath(), 'cache', 'deep_models', 'intentizers', 'FullyConnected'))
  }
  load() {
    this._clf.load(path.join(getAppDataPath(), 'cache', 'deep_models', 'intentizers', 'FullyConnected'))
  }
}
