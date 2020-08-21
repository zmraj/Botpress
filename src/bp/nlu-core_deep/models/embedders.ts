const ort = require("onnxruntime");
import axios from "axios";
import fs from "fs";
import fse from "fs-extra";
import { has } from "lodash";
import lru from "lru-cache";
import { mean, reshape } from "mathjs";
import path from "path";
import {
  BertWordPieceTokenizer,
  BPETokenizer,
  ByteLevelBPETokenizer,
  SentencePieceBPETokenizer,
} from "tokenizers";

export class Embedder {
  private _embedder: typeof ort.InferenceSession;
  private _tokenizer: BertWordPieceTokenizer | BPETokenizer | ByteLevelBPETokenizer;
  private _cache: lru<string, Float32Array>;
  private _embedSize: number;

  constructor(public lang: string) {
    this._embedSize = 768;
  }

  async load() {
    // Preloading if embedder exists
    // vocab.txt => Load an existing bert embedder
    if (fs.existsSync(path.join(process.APP_DATA_PATH, "tokenizers", "vocab.txt"))) {
      this._tokenizer = await BertWordPieceTokenizer.fromOptions({
        vocabFile: path.join(process.APP_DATA_PATH, "tokenizers", "vocab.txt"),
      });
      console.log("Bert tokenizer Loaded");
      // vocab.json => Load an existing BPE embedder
    } else if (
      fs.existsSync(path.join(this.tokenizer_vocab_folder, "vocab.json"))
    ) {
      console.log("Loading BPE Tokenizer");
      this.tokenizer = await BPETokenizer.fromOptions({
        vocabFile: path.join(this.tokenizer_vocab_folder, "vocab.json"),
        mergesFile: path.join(this.tokenizer_vocab_folder, "merges.txt"),
      });
      console.log("Loaded BPE Tokenizer");
    } else {
      console.log("Cannot load Embedder, check the files path");
    }

    // Create the ONNX Graph (inference only for now)
    this.embedder = await ort.InferenceSession.create(this.embedder_onnx_file);

    // Predict one element to get this.embeddings size
    // this.embed_size = (
    //   await this.embed("Dummy sentence to get embedding size", true)
    // ).length;
    // console.log("embed size laoded", this.embed_size);

    // Get the existing cache or create a new one
    if (await fse.pathExists(this.cache_path)) {
      const dump = await fse.readJSON(this.cache_path);
      if (dump) {
        const kve = dump.map((x) => ({
          e: x.e,
          k: x.k,
          v: Float32Array.from(Object.values(x.v)),
        }));
        this.cache.load(kve);
      }
    } else {
      this.cache = new lru<string, Float32Array>({
        length: (arr: Float32Array) => {
          if (arr && arr.BYTES_PER_ELEMENT) {
            return arr.length * arr.BYTES_PER_ELEMENT;
          } else {
            return 768 /* dim */ * Float32Array.BYTES_PER_ELEMENT;
          }
        },
        max:
          768 /* dim */ *
          Float32Array.BYTES_PER_ELEMENT /* bytes */ *
          10000000 /* 10M sentences */,
      });
    }
  }

  async save() {
    await fse.ensureFile(this.cache_path);
    await fse.writeJSON(this.cache_path, this.cache.dump());
  }

  async embed(sentence: string): Promise<number[]> {
    const cache_key = hash_str(sentence);

    if (this.cache.has(cache_key)) {
      return Array.from(this.cache.get(cache_key).values());
    } else {
      const sentence_embeddings: number[] = [];

      for (const s of sentence.match(regex_sentence) || [sentence]) {
        const tokens = await this.tokenizer.encode(s);
        const id_array = BigInt64Array.from(tokens.ids, (x) => BigInt(x));
        const attention_array = BigInt64Array.from(tokens.attentionMask, (x) =>
          BigInt(x)
        );

        const ids = new ort.Tensor("int64", id_array, [1, tokens.length]);
        const attention = new ort.Tensor("int64", attention_array, [
          1,
          tokens.length,
        ]);

        const results = await this.embedder.run({
          input_ids: ids,
          attention_mask: attention,
        });

        const embedding = reshape(
          Array.from(results.output_0.data),
          results.output_0.dims
        );

        const mean_embed = mean(embedding[0], 0);
        sentence_embeddings.push(mean_embed);
      }

      const sentence_embed = mean(sentence_embeddings, 0);

      this.cache.set(cache_key, sentence_embed);
      return sentence_embed;
    }
  }
}
