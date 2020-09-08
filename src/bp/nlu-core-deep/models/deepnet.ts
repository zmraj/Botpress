import * as tf from '@tensorflow/tfjs-node'
import { NLU } from 'botpress/sdk'
import fse from 'fs-extra'
import path from 'path'

import { Datas, preprocessDatas } from './data_loader'
import Embedder from './embedders'

export class Net {
  private _embedder: Embedder
  public netPath: string
  private _clf
  constructor(public lang: string, private _nbIntents: number) {
    this._embedder = new Embedder(lang)
    this.netPath = path.join(process.APP_DATA_PATH, lang, 'model')
  }

  async train(intents: NLU.IntentDefinition[], entities: NLU.EntityDefinition[]): Promise<void> {
    await this.load(this.lang, this.netPath)
    const datas: Datas = await preprocessDatas(intents, entities, this._embedder)

    // await this._clf.fit(tf.tensor2d(datas.embed), tf.oneHot(tf.tensor1d(datas.labels, 'int32'), this._nbIntents)), {
    await this._clf.fit(tf.tensor2d(datas.embed), tf.tensor1d(datas.labels, 'int32'), {
      batchSize: 512,
      epochs: 200,
      // validationSplit: 0.1,
      verbose: 0,
      shuffle: true,
      callbacks: tf.callbacks.earlyStopping({
        monitor: 'loss',
        patience: 5,
        minDelta: 0.01
      })
    })
    console.log('done')
    this._clf.save(this.netPath)
  }

  async predict(sentence: string): Promise<[number, number, number[][]]> {
    const embed: number[] = await this._embedder.embed(sentence)
    const tens: tf.Tensor = tf.tensor1d(embed).reshape([1, this._embedder.embedSize])
    const probs: tf.Tensor = this._clf.predict(tens).reshape([this._embedder.embedSize])
    const { values, indices } = tf.topk(probs, 3, true)
    const top_k_values: number[] = Array.from(values.dataSync())
    const top_k_indices: number[] = Array.from(indices.dataSync())
    const top_k: number[][] = top_k_indices.map((e, i) => [e, top_k_values[i]])
    const pred: tf.Tensor = tf.argMax(probs)
    const proba: tf.Tensor = tf.max(probs)
    return [pred.dataSync()[0], proba.dataSync()[0], top_k]
  }

  async load(language, path) {
    if (this._clf) {
      return
    }
    this._embedder = new Embedder(language)
    await this._embedder.load()
    this._clf = tf.sequential()
    this._clf.add(tf.layers.inputLayer({ inputShape: [this._embedder.embedSize] }))
    this._clf.add(tf.layers.dense({ units: this._embedder.embedSize, useBias: true }))
    this._clf.add(tf.layers.dropout({ rate: 0.3 }))
    this._clf.add(tf.layers.batchNormalization())
    this._clf.add(tf.layers.leakyReLU())
    this._clf.add(tf.layers.dense({ units: this._nbIntents, useBias: true }))

    this._clf.compile({
      optimizer: tf.train.adam(0.0001),
      loss: tf.losses.sigmoidCrossEntropy
      // metrics: ['accuracy']
    })
    this.netPath = path
    if (fse.existsSync(this.netPath)) {
      this._clf.load(this.netPath)
    }
  }
}
