const ort = require('onnxruntime')
import { getAppDataPath } from 'common/utils'
import fse from 'fs-extra'
import { has } from 'lodash'
import lru from 'lru-cache'
import { mean, reshape } from 'mathjs'
import path from 'path'
import { BertWordPieceTokenizer } from 'tokenizers'

import { hash_str } from './tools'

export class DeepEmbedder {
  embedder_onnx_file: string
  tokenizer_vocab_file: string
  tokenizer: BertWordPieceTokenizer
  cache_path: string
  cache: lru<string, Float32Array>
  embedder: typeof ort.InferenceSession

  constructor(model_name: string) {
    console.log(model_name)
    this.embedder_onnx_file = path.join(
      __dirname,
      '..',
      '..',
      'onnx_models',
      'embedders',
      model_name,
      `${model_name}.onnx`
    )
    this.tokenizer_vocab_file = path.join(__dirname, '..', '..', 'onnx_models', 'tokenizers', model_name, 'vocab.txt')
    this.cache_path = path.join(__dirname, '..', '..', 'onnx_models', 'embedders', model_name, 'embedder_cache.json')
  }
  async load() {
    this.tokenizer = await BertWordPieceTokenizer.fromOptions({ vocabFile: this.tokenizer_vocab_file })
    this.embedder = await ort.InferenceSession.create(this.embedder_onnx_file)

    if (await fse.pathExists(this.cache_path)) {
      const dump = await fse.readJSON(this.cache_path)
      if (dump) {
        const kve = dump.map(x => ({ e: x.e, k: x.k, v: Float32Array.from(Object.values(x.v)) }))
        this.cache.load(kve)
      }
    } else {
      this.cache = new lru<string, Float32Array>({
        length: (arr: Float32Array) => {
          if (arr && arr.BYTES_PER_ELEMENT) {
            return arr.length * arr.BYTES_PER_ELEMENT
          } else {
            return 768 /* dim */ * Float32Array.BYTES_PER_ELEMENT
          }
        },
        max: 768 /* dim */ * Float32Array.BYTES_PER_ELEMENT /* bytes */ * 10000000 /* 10M sentences */
      })
    }
  }

  async save() {
    await fse.ensureFile(this.cache_path)
    await fse.writeJSON(this.cache_path, this.cache.dump())
  }

  async embed(sentence: string): Promise<number[]> {
    const cache_key = hash_str(sentence)
    if (this.cache.has(cache_key)) {
      return Array.from(this.cache.get(cache_key).values())
    } else {
      const tokens = await this.tokenizer.encode(sentence)
      const id_array = BigInt64Array.from(tokens.ids, x => BigInt(x))
      const attention_array = BigInt64Array.from(tokens.attentionMask, x => BigInt(x))
      const ids = new ort.Tensor('int64', id_array, [1, tokens.length])
      const attention = new ort.Tensor('int64', attention_array, [1, tokens.length])
      const results = await this.embedder.run({ input_ids: ids, attention_mask: attention })
      const embedding = reshape(Array.from(results.output_0.data), results.output_0.dims)
      const mean_embed = mean(embedding[0], 0)
      this.cache.set(cache_key, mean_embed)
      return mean_embed
    }
  }
}
