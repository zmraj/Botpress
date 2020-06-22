const ort = require('onnxruntime')
import axios from 'axios'
import { getAppDataPath } from 'common/utils'
import fs from 'fs'
import fse from 'fs-extra'
import { has } from 'lodash'
import lru from 'lru-cache'
import { mean, reshape } from 'mathjs'
import path from 'path'
import { BertWordPieceTokenizer, BPETokenizer, ByteLevelBPETokenizer, SentencePieceBPETokenizer } from 'tokenizers'

import { hash_str } from './tools'

export class DeepEmbedder {
  embedder_onnx_file: string
  tokenizer_vocab_folder: string
  tokenizer: BertWordPieceTokenizer | BPETokenizer | ByteLevelBPETokenizer
  cache_path: string
  cache: lru<string, Float32Array>
  model_name: string
  embedder: typeof ort.InferenceSession

  constructor(model_name: string) {
    this.model_name = model_name
    this.embedder_onnx_file = path.join(
      __dirname,
      '..',
      '..',
      'onnx_models',
      'embedders',
      model_name,
      `${model_name}.onnx`
    )
    this.tokenizer_vocab_folder = path.join(__dirname, '..', '..', 'onnx_models', 'tokenizers', model_name)
    this.cache_path = path.join(__dirname, '..', '..', 'onnx_models', 'embedders', model_name, 'embedder_cache.json')
  }
  async load() {
    if (fs.existsSync(path.join(this.tokenizer_vocab_folder, 'vocab.txt'))) {
      console.log('Loading Bert Tokenizer')
      this.tokenizer = await BertWordPieceTokenizer.fromOptions({
        vocabFile: path.join(this.tokenizer_vocab_folder, 'vocab.txt')
      })
    } else if (fs.existsSync(path.join(this.tokenizer_vocab_folder, 'vocab.json'))) {
      console.log('Loading BPE Tokenizer')
      this.tokenizer = await BPETokenizer.fromOptions({
        vocabFile: path.join(this.tokenizer_vocab_folder, 'vocab.json'),
        mergesFile: path.join(this.tokenizer_vocab_folder, 'merges.txt')
      })
      console.log('Loaded BPE Tokenizer')
    }
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

  async embed(sentence: string, verbose: boolean = false): Promise<number[]> {
    const cache_key = hash_str(sentence)
    if (this.cache.has(cache_key)) {
      return Array.from(this.cache.get(cache_key).values())
    } else {
      const sentence_embeddings: number[] = []
      for (const s of sentence.match(
        /(?<=\s+|^)[\"\'\'\"\'\"\[\(\{\⟨](.*?[.?!])(\s[.?!])*[\"\'\'\"\'\"\]\)\}\⟩](?=\s+|$)|(?<=\s+|^)\S(.*?[.?!])(\s[.?!])*(?=\s+|$)/g
      ) || [sentence]) {
        if (verbose) {
          console.log('Sentence :', s)
        }
        const tokens = await this.tokenizer.encode(s)
        const id_array = BigInt64Array.from(tokens.ids, x => BigInt(x))
        if (verbose) {
          console.log('Id length : ', id_array.length)
        }
        const attention_array = BigInt64Array.from(tokens.attentionMask, x => BigInt(x))
        const ids = new ort.Tensor('int64', id_array, [1, tokens.length])
        const attention = new ort.Tensor('int64', attention_array, [1, tokens.length])
        const results = await this.embedder.run({ input_ids: ids, attention_mask: attention })
        if (verbose) {
          console.log('Dims :', results.output_0.dims)
        }
        const embedding = reshape(Array.from(results.output_0.data), results.output_0.dims)
        const mean_embed = mean(embedding[0], 0)
        sentence_embeddings.push(mean_embed)
      }
      if (verbose) {
        console.log(sentence_embeddings)
      }
      const sentence_embed = mean(sentence_embeddings, 0)
      if (verbose) {
        console.log(sentence_embed)
      }
      this.cache.set(cache_key, sentence_embed)
      return sentence_embed
    }
  }
}

export class PythonEmbedder {
  cache_path: string
  cache: lru<string, Float32Array>
  model_name: string
  embedder: typeof ort.InferenceSession

  constructor() {
    this.model_name = 'PythonEmbedder'
    this.cache_path = path.join(
      __dirname,
      '..',
      '..',
      'onnx_models',
      'embedders',
      this.model_name,
      'embedder_cache.json'
    )
  }

  async load() {
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
    // console.log('FLKSDFLK : ', sentence)
    const cache_key = hash_str(sentence)
    if (this.cache.has(cache_key)) {
      return Array.from(this.cache.get(cache_key).values())
    } else {
      const { data } = await axios.post('http://localhost:8000/embeddings', { documents: [sentence] })
      const embedding: number[] = data.data[0]
      this.cache.set(cache_key, Float32Array.from(embedding))
      return embedding
    }
  }
}
