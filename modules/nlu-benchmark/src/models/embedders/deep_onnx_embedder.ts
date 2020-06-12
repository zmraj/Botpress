const ort = require('onnxruntime')
import { getAppDataPath } from 'common/utils'
import fs from 'fs'
import path from 'path'
import {
  BertWordPieceTokenizer,
  BPETokenizer,
  ByteLevelBPETokenizer,
  Encoding,
  SentencePieceBPETokenizer,
  TruncationStrategy
} from 'tokenizers'

export class DeepEmbedder {
  embedder_onnx_file: string
  tokenizer_vocab_file: string
  tokenizer
  embedder
  constructor(model_name: string) {
    const model_folder = path.join(getAppDataPath(), 'deep_models', 'embedders', 'onnx', model_name)
    const tokenizer_folder = path.join(getAppDataPath(), 'deep_models', 'tokenizers', model_name)
    fs.access(model_folder, error => {
      console.log('Cannot find folder :', model_folder)
    })

    this.embedder_onnx_file = path.join(model_folder, `${model_name}.onnx`)
    fs.access(this.embedder_onnx_file, error => {
      console.log('Cannot find onnx file :', this.embedder_onnx_file)
    })

    this.tokenizer_vocab_file = path.join(tokenizer_folder, 'vocab.txt')
    fs.access(this.tokenizer_vocab_file, error => {
      console.log('Cannot find vocab file', this.tokenizer_vocab_file)
    })
  }
  async load() {
    this.tokenizer = await BertWordPieceTokenizer.fromOptions({ vocabFile: this.tokenizer_vocab_file })
    this.embedder = await ort.InferenceSession.create(this.embedder_onnx_file)
  }
  async embed(sentence: string): Promise<number[]> {
    const tokens = await this.tokenizer.encode(sentence)
    // console.log(tokens.tokens)
    // console.log(tokens.ids)

    const id_array = BigInt64Array.from(tokens.ids, x => BigInt(x))
    const attention_array = BigInt64Array.from(tokens.attentionMask, x => BigInt(x))
    // console.log(attention_array)
    // console.log(id_array)
    const ids = new ort.Tensor('int64', id_array, [1, tokens.length])
    const attention = new ort.Tensor('int64', attention_array, [1, tokens.length])
    const inputs = { input_ids: ids, attention_mask: attention }
    const results = await this.embedder.run(inputs)
    const embedding: number[] = results.output_0.data
    // console.log('Size : ', results.output_0.dims)
    return embedding
  }
}
