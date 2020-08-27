import * as tf from '@tensorflow/tfjs-node'
import fse from 'fs-extra'
import path from 'path'

import { Datas, preprocessDatas } from './data_loader'
import Embedder from './embedders'

export class Net {
  private _embedder: Embedder
  private _netPath: string
  private _clf
  constructor(public lang: string, private _nbIntents: number) {
    this._embedder = new Embedder(lang)
    this._netPath = path.join(process.APP_DATA_PATH, 'models', lang)

    this._clf = tf.sequential()
    this._clf.add(tf.layers.inputLayer({ inputShape: [this._embedder.embedSize] }))
    this._clf.add(tf.layers.dense({ units: this._embedder.embedSize, useBias: true }))
    this._clf.add(tf.layers.dropout({ rate: 0.3 }))
    this._clf.add(tf.layers.batchNormalization())
    this._clf.add(tf.layers.leakyReLU())
    this._clf.add(tf.layers.dense({ units: this._nbIntents, useBias: true }))
    this._clf.add(tf.layers.softmax())

    this._clf.compile({
      optimizer: tf.train.adam(0.0001),
      loss: tf.losses.softmaxCrossEntropy,
      metrics: ['accuracy'],
    })
  }

  private async _train(intents, entities): Promise<void> {
    const datas = preprocessDatas(intents, entities, this._embedder)
    const X = datas.map(o => o.embed)
    const y = datas.map(o => o.intent)

    await this._clf.fit(
      tf.tensor2d(X),
      tf.oneHot(tf.tensor1d(y, 'int32'), this._nbIntents),
      {
        batchSize: 512,
        epochs: 200,
        // validationSplit: 0.1,
        verbose: 0,
        shuffle: true,
        callbacks: tf.callbacks.earlyStopping({
          monitor: 'loss',
          patience: 5,
          minDelta: 0.01,
        }),
      }
    )
  }

  async predict(sentence: string): Promise<[number, number, number[][]]> {
    const embed: number[] = await this._embedder.embed(sentence)
    const tens: tf.Tensor = tf.tensor1d(embed).reshape([1, this._embedder.embedSize])
    const probs: tf.Tensor = this._clf.predict(tens).reshape([this._embedder.embedSize])
    const { values, indices } = tf.topk(probs, 3, true)
    const top_k_values = Array.from(values.dataSync())
    const top_k_indices = Array.from(indices.dataSync())
    const top_k: number[][] = top_k_indices.map((e, i) => [e, top_k_values[i]])
    const pred: tf.Tensor = tf.argMax(probs)
    const proba: tf.Tensor = tf.max(probs)
    return [pred.dataSync()[0], proba.dataSync()[0], top_k]
  }

  async loadOrTrain(intents, entities) {
    await this._embedder.load()
    if (fse.existsSync(this._netPath)) {
      this._clf.load(this._netPath)
    } else {
      await this._train(intents, entities)
      this._clf.save(this._netPath)
    }
  }

}
