import * as tf from '@tensorflow/tfjs-node'
import { TFSavedModel } from '@tensorflow/tfjs-node/dist/saved_model'
import path from 'path'
import {
  BertWordPieceTokenizer,
  BPETokenizer,
  ByteLevelBPETokenizer,
  Encoding,
  SentencePieceBPETokenizer,
  TruncationStrategy
} from 'tokenizers'

class DeepModel {
  model: TFSavedModel
  tokenizer: BertWordPieceTokenizer | BPETokenizer | ByteLevelBPETokenizer | SentencePieceBPETokenizer
  model_path: string
  constructor(model_path: string) {
    this.model_path = model_path
  }
  async load() {
    this.model = await tf.node.loadSavedModel(this.model_path)
    this.tokenizer = await BertWordPieceTokenizer.fromOptions({
      vocabFile: path.join(this.model_path, 'vocab.txt'),
      lowercase: true
    })
  }
  async embed(sentence: string) {
    const tokens = await this.tokenizer.encode(sentence)
    const result = tf.tidy(() => {
      const inputTensor = tf.tensor(tokens.ids, undefined, 'int32')
      const maskTensor = tf.tensor(tokens.attentionMask, undefined, 'int32')
      const inputTensor2 = tf.expandDims(inputTensor, 0)
      return this.model.predict({ ['input_ids']: inputTensor, ['attention_mask']: maskTensor }) as tf.NamedTensorMap
    })
    const array_result = await result['output_0']
      .squeeze()
      .sum(0)
      .array()
    return array_result as number[]
  }
  async train(dataset: any) {}
  async predict(intent: string) {}
}
