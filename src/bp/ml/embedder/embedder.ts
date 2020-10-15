const ort = require('onnxruntime')
import { getAppDataPath } from 'common/utils'
import crypto from 'crypto'
import fs from 'fs'
import { mean, reshape } from 'mathjs'
import path from 'path'
import { BertWordPieceTokenizer, BPETokenizer, ByteLevelBPETokenizer, SentencePieceBPETokenizer } from 'tokenizers'

export function hash_str(str: string): string {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex')
}

export class Embedder {
  embedder_onnx_file: string
  tokenizer_vocab_folder: string
  tokenizer: BertWordPieceTokenizer | BPETokenizer | ByteLevelBPETokenizer | SentencePieceBPETokenizer
  lang: string
  embedder: typeof ort.InferenceSession

  constructor(lang: string) {
    this.lang = lang
    this.embedder_onnx_file = path.join(getAppDataPath(), 'embedders', lang, 'model.onnx')
    this.tokenizer_vocab_folder = path.join(getAppDataPath(), 'tokenizers', lang)
  }

  async load() {
    if (fs.existsSync(path.join(this.tokenizer_vocab_folder, 'vocab.txt'))) {
      this.tokenizer = await BertWordPieceTokenizer.fromOptions({
        vocabFile: path.join(this.tokenizer_vocab_folder, 'vocab.txt')
      })

    } else if (fs.existsSync(path.join(this.tokenizer_vocab_folder, 'vocab.json'))) {
      this.tokenizer = await BPETokenizer.fromOptions({
        vocabFile: path.join(this.tokenizer_vocab_folder, 'vocab.json'),
        mergesFile: path.join(this.tokenizer_vocab_folder, 'merges.txt')
      })
    }

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
