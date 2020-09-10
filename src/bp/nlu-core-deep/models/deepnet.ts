import * as tf from '@tensorflow/tfjs-node'
import { NLU } from 'botpress/sdk'
import fse from 'fs-extra'
import path from 'path'

import { Datas, preprocessDatas } from './data_loader'
import Embedder from './embedders'

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

interface Intents {
  label: string
  confidence: number
  slots: NLU.SlotCollection
  extractor: 'exact-matcher' | 'classifier'
}
export class Net {
  private _embedder: Embedder
  public netPath: string
  private _clf
  private _cancelCb = new CancelCallback()
  private _intToLabel: { [key: number]: string }

  constructor(public lang: string, private _nbIntents: number, private botId: string) {
    this._embedder = new Embedder(lang)
    this.netPath = path.join(process.APP_DATA_PATH, lang, botId, 'model')
    this._intToLabel = {}
  }

  async train(intents: NLU.IntentDefinition[], entities: NLU.EntityDefinition[]): Promise<void> {
    await this.load(this.lang, this.netPath)
    const { datas, intToLabel }: { datas: Datas; intToLabel: { [key: number]: string } } = await preprocessDatas(
      intents,
      entities,
      this._embedder
    )
    this._intToLabel = intToLabel

    await this._clf.fit(tf.tensor2d(datas.embed), tf.oneHot(tf.tensor1d(datas.labels, 'int32'), this._nbIntents), {
      batchSize: 512,
      epochs: 2000,
      // validationSplit: 0.1,
      verbose: 0,
      shuffle: true,
      callbacks: [
        tf.callbacks.earlyStopping({
          monitor: 'loss',
          patience: 50,
          minDelta: 0.0001
        }),
        this._cancelCb,
        new tf.CustomCallback({ onEpochEnd: (epoch, logs) => console.log('coucou', logs!.loss) })
      ]
    })
    console.log('done')
    await this._clf.save(`file://${this.netPath}`)
    // Note : Possible to save in file(node) LocalStorage, indexdDB, httpRequest https://www.tensorflow.org/js/guide/save_load
    await fse.writeFile(path.join(this.netPath, 'metadata'), JSON.stringify(this._intToLabel, undefined, 2))
  }

  cancel() {
    this._cancelCb.doCancel()
  }

  async predict(sentence: string): Promise<[string, number, Intents[]]> {
    const embed: number[] = await this._embedder.embed(sentence)
    const tens: tf.Tensor = tf.tensor1d(embed).reshape([1, this._embedder.embedSize])
    const probs: tf.Tensor = tf.sigmoid(this._clf.predict(tens).reshape([this._nbIntents]))
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
    const proba: tf.Tensor = tf.max(probs)
    return [this._intToLabel[pred.dataSync()[0]], proba.dataSync()[0], top_k]
  }

  async load(language, modelPath) {
    if (this._clf) {
      return
    }
    this.netPath = modelPath
    this._embedder = new Embedder(language)
    await this._embedder.load()
    await fse.ensureDir(this.netPath)
    if (fse.existsSync(path.join(this.netPath, 'model.json'))) {
      this._clf = await tf.loadLayersModel(`file://${this.netPath}/model.json`)
      // Note : Possible to load from file(node) LocalStorage, indexdDB, httpRequest https://www.tensorflow.org/js/guide/save_load
      const metadata = await fse.readFile(path.join(this.netPath, 'metadata'), 'utf8')
      this._intToLabel = JSON.parse(metadata)
    } else {
      this._clf = tf.sequential()
      this._clf.add(tf.layers.inputLayer({ inputShape: [this._embedder.embedSize] }))
      this._clf.add(tf.layers.dense({ units: this._embedder.embedSize, useBias: true }))
      this._clf.add(tf.layers.dropout({ rate: 0.3 }))
      this._clf.add(tf.layers.batchNormalization())
      this._clf.add(tf.layers.leakyReLU())
      this._clf.add(tf.layers.dense({ units: Math.floor((786 + this._nbIntents) / 2), useBias: true }))
      this._clf.add(tf.layers.dropout({ rate: 0.3 }))
      this._clf.add(tf.layers.batchNormalization())
      this._clf.add(tf.layers.leakyReLU())
      this._clf.add(tf.layers.dense({ units: this._nbIntents, useBias: true }))
    }
    this._clf.summary()
    await this._clf.compile({
      optimizer: tf.train.adam(0.0001),
      loss: tf.losses.sigmoidCrossEntropy
    })
  }
}
