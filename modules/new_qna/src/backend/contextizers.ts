import { MLToolkit } from 'botpress/sdk'
import fs from 'fs'
import path from 'path'
export class Contextizer {
  svm_trainer
  svm_predictor
  model
  embedder
  model_path
  constructor(embedder, private bp_sdk) {
    this.embedder = embedder
    this.model_path = path.join(__dirname, '..', '..', 'onnx_models', 'contextizers', 'model.json')
  }
  async load() {
    if (fs.existsSync(this.model_path)) {
      this.model = fs.readFileSync(this.model_path, 'utf-8')
      this.svm_predictor = new this.bp_sdk.MLToolkit.SVM.Predictor(this.model)
    } else {
      await this.train()
      this.svm_predictor = new this.bp_sdk.MLToolkit.SVM.Predictor(this.model)
    }
  }
  async train() {
    const string_datas = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'datas', 'questions_context.json'), 'utf-8')
    )
    this.svm_trainer = new this.bp_sdk.MLToolkit.SVM.Trainer()
    console.log('Embedding training datas')

    const datas = []
    for (const s of string_datas) {
      const coordinates = await this.embedder.embed(s[0])
      const label = s[1]
      datas.push({ coordinates, label })
    }

    console.log('Done embeded datas')
    console.log('Trainning svm')
    this.model = await this.svm_trainer.train(datas, { kernel: 'LINEAR', classifier: 'C_SVC' })
    console.log('DONE trainning svm')
    fs.writeFileSync(this.model_path, this.model)
  }

  async predict(utterance: number[]) {
    const prediction = await this.svm_predictor.predict(utterance)
    const best_prediction = prediction.slice(0, 1)[0]
    return best_prediction.label
  }
}
