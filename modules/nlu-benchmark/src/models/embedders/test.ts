const ort = require('onnxruntime')
import fs from 'fs'
import { mean, reshape } from 'mathjs'
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
    console.log(model_name)
    const model_folder = '/home/pedro/botpress/cache/deep_models/embedders/onnx/distilbert-base-multilingual-cased'
    const tokenizer_folder = path.join(
      '/home/pedro/botpress/cache/deep_models/tokenizers/onnx/distilbert-base-multilingual-cased'
    )
    this.embedder_onnx_file = path.join(model_folder, `${model_name}.onnx`)
    this.tokenizer_vocab_file = path.join(tokenizer_folder, 'vocab.txt')
  }
  async load() {
    this.tokenizer = await BertWordPieceTokenizer.fromOptions({ vocabFile: this.tokenizer_vocab_file })
    this.embedder = await ort.InferenceSession.create(this.embedder_onnx_file)
  }
  async embed(sentence: string): Promise<number[]> {
    const tokens = await this.tokenizer.encode(sentence)
    const id_array = BigInt64Array.from(tokens.ids, x => BigInt(x))
    const attention_array = BigInt64Array.from(tokens.attentionMask, x => BigInt(x))
    const ids = new ort.Tensor('int64', id_array, [1, tokens.length])
    const attention = new ort.Tensor('int64', attention_array, [1, tokens.length])
    const results = await this.embedder.run({ input_ids: ids, attention_mask: attention })
    const embedding = reshape(Array.from(results.output_0.data), results.output_0.dims)
    const mean_embed = mean(embedding[0], 0)
    return mean_embed
  }
}
