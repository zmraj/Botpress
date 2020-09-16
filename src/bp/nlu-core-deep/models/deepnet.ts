import * as tf from '@tensorflow/tfjs-node'
import { NLU } from 'botpress/sdk'
import fse from 'fs-extra'
import path from 'path'
import tar from 'tar'
import tmp from 'tmp'

import { Datas, preprocessDatas } from './data_loader'
import Embedder from './embedders'
import { spellCheck } from './utils'
const BATCH_SIZE = 64
const MAX_EPOCHS = 200
const PATIENCE = 50
const MIN_DELTA = 0.0001
const MAX_LR = 0.99
const LR_DECAY = 0.99

class CancelCallback extends tf.Callback {
  private cancelRequired = false

  async onBatchEnd(epoch, logs) {
    if (this.cancelRequired) {
      this.model.stopTraining = true
    }
  }

  doCancel() {
    this.cancelRequired = true
  }
}

class LRSheduler extends tf.Callback {
  constructor(private decay: number) {
    super()
  }

  async onEpochEnd(epoch, logs) {
    if (epoch > 5) {
      // @ts-ignore
      this.model.optimizer_.learningRate *= this.decay
    }
    // @ts-ignore
    console.log('LR  ', this.model.optimizer_.learningRate, 'Logs : ', logs)
  }
}

// const customLoss = (x: tf.Tensor, y: tf.Tensor) => {
//   console.log('x,y   ', x.dataSync(), y.dataSync())
//   x.print()
//   y.print()
//   return tf.losses.softmaxCrossEntropy(x, y)
// }

interface Intents {
  label: string
  confidence: number
  slots: NLU.SlotCollection
  extractor: 'exact-matcher' | 'classifier'
}
export class Net {
  private _embedder: Embedder
  private _clf
  private _cancelCb = new CancelCallback()
  private _intToLabel: { [key: number]: string }

  constructor(public lang: string, private _nbIntents: number, private botId: string) {
    this._embedder = new Embedder(lang)
    this._intToLabel = {}
  }

  async train(intents: NLU.IntentDefinition[], entities: NLU.EntityDefinition[], botId: string) {
    const { datas, intToLabel }: { datas: Datas; intToLabel: { [key: number]: string } } = await preprocessDatas(
      intents,
      entities,
      this._embedder
    )
    this._intToLabel = intToLabel

    await this._clf.fit(tf.tensor2d(datas.embed), tf.oneHot(tf.tensor1d(datas.labels, 'int32'), this._nbIntents), {
      batchSize: BATCH_SIZE,
      epochs: MAX_EPOCHS,
      // validationSplit: 0.1,
      verbose: 0,
      shuffle: true,
      callbacks: [
        tf.callbacks.earlyStopping({
          monitor: 'loss',
          patience: PATIENCE,
          minDelta: MIN_DELTA
        }),
        this._cancelCb,
        new LRSheduler(LR_DECAY)
      ]
    })
    console.log('done')

    await fse.mkdirp(path.join(process.PROJECT_LOCATION, 'data', 'bots', botId, 'deepModel'))
    await this._clf.save(`file://${path.join(process.PROJECT_LOCATION, 'data', 'bots', botId, 'deepModel')}`)
    // Note : Possible to save in file(node) LocalStorage, indexdDB, httpRequest https://www.tensorflow.org/js/guide/save_load
    await fse.writeFile(
      path.join(process.PROJECT_LOCATION, 'data', 'bots', botId, 'deepModel', 'metadata.json'),
      JSON.stringify(
        { intToLabel: this._intToLabel, inputSize: this._embedder.embedSize, outputSize: this._nbIntents },
        undefined,
        2
      )
    )

    return { intToLabel: this._intToLabel, inputSize: this._embedder.embedSize, outputSize: this._nbIntents }
  }

  cancel() {
    this._cancelCb.doCancel()
  }

  async predict(sentence: string): Promise<[string, number, Intents[]]> {
    // const spelledSentence = await spellCheck([sentence], this._embedder.lang)[0]
    const spelledSentence = sentence
    const embed: number[] = await this._embedder.embed(spelledSentence)
    const tens: tf.Tensor = tf.tensor1d(embed).reshape([1, this._embedder.embedSize])
    const rawProbs: tf.Tensor = this._clf.predict(tens).reshape([this._nbIntents])
    const probs: tf.Tensor = tf.softmax(rawProbs)
    console.log('probs', probs.dataSync())
    const { values, indices } = tf.topk(probs, 3, true)
    const top_k_values: number[] = Array.from(values.dataSync())
    const top_k_indices: number[] = Array.from(indices.dataSync())
    const top_k: Intents[] = top_k_indices.map((e, i) => {
      return {
        label: this._intToLabel[e],
        confidence: top_k_values[i],
        slots: {} as NLU.SlotCollection,
        extractor: 'classifier'
      } as Intents
    })
    const pred: tf.Tensor = tf.argMax(probs)
    const proba: number = tf.max(probs).dataSync()[0]
    const label = proba > 0.51 ? this._intToLabel[pred.dataSync()[0]] : 'none'
    return [label, proba, top_k]
  }

  async load(language: string, botId: string | undefined) {
    if (this._clf) {
      return
    }

    this._embedder = new Embedder(language)
    await this._embedder.load()

    if (botId) {
      this._clf = await tf.loadLayersModel(
        `file://${path.join(process.PROJECT_LOCATION, 'data', 'bots', botId, 'deepModel', 'model.json')}`
      )
      // Note : Possible to load from file(node) LocalStorage, indexdDB, httpRequest https://www.tensorflow.org/js/guide/save_load
      const metadata = await fse.readFile(
        path.join(process.PROJECT_LOCATION, 'data', 'bots', botId, 'deepModel', 'metadata.json'),
        'utf8'
      )
      this._intToLabel = JSON.parse(metadata).intToLabel
    } else {
      this._clf = tf.sequential()
      this._clf.add(tf.layers.inputLayer({ inputShape: [this._embedder.embedSize] }))
      this._clf.add(tf.layers.dense({ units: this._embedder.embedSize, useBias: true }))
      this._clf.add(tf.layers.batchNormalization())
      this._clf.add(tf.layers.leakyReLU())
      this._clf.add(tf.layers.dropout({ rate: 0.3 }))
      this._clf.add(
        tf.layers.dense({ units: Math.floor((this._embedder.embedSize + this._nbIntents) / 2), useBias: true })
      )
      this._clf.add(tf.layers.batchNormalization())
      this._clf.add(tf.layers.leakyReLU())
      this._clf.add(tf.layers.dropout({ rate: 0.3 }))
      this._clf.add(tf.layers.dense({ units: this._nbIntents, useBias: true, activation: 'sigmoid' }))
    }
    this._clf.summary()
    await this._clf.compile({
      optimizer: tf.train.adam(MAX_LR),
      loss: tf.losses.softmaxCrossEntropy
      // loss: customLoss
    })
  }
}
