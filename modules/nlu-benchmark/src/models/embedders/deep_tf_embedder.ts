// const ort = require('onnxruntime')
// import { getAppDataPath } from 'common/utils'
// import path from 'path'
// import {
//   BertWordPieceTokenizer,
//   BPETokenizer,
//   ByteLevelBPETokenizer,
//   Encoding,
//   SentencePieceBPETokenizer,
//   TruncationStrategy
// } from 'tokenizers'

// export class DeepEmbedder {
//   constructor(model_name: string) {
//     const model_folder = path.join(getAppDataPath(), 'deep_model', model_name)
//     fs.access('somefile', error => {
//       if (!error) {
//         // The check succeeded
//       } else {
//         // The check failed
//       }
//     })
//   }
//   async load() {
//     const tokenizer = await BertWordPieceTokenizer.fromOptions({ vocabFile: './vocab.txt' })
//   }
// }
// async function main() {
//   try {
//     const wpEncoded = await wordPieceTokenizer.encode(
//       "Coucou, je m'apelle Pierre et je teste l'inférence avec ONNX ! Swag"
//     )
//     console.log(wpEncoded.tokens)
//     console.log(wpEncoded.ids)
//     // create a new session and load the specific model.
//     //
//     // the model in this example contains a single MatMul node
//     // it has 2 inputs: 'a'(float32, 3x4) and 'b'(float32, 4x3)
//     // it has 1 output: 'c'(float32, 3x3)
//     const session = await ort.InferenceSession.create('./distilbert.onnx')

//     // prepare inputs. a tensor need its corresponding TypedArray as data
//     const id_array = BigInt64Array.from(wpEncoded.ids, x => BigInt(x))
//     const attention_array = BigInt64Array.from(wpEncoded.attentionMask, x => BigInt(x))
//     console.log(id_array)
//     console.log(attention_array)
//     const ids = new ort.Tensor('int64', id_array, [1, wpEncoded.length])
//     const attention = new ort.Tensor('int64', attention_array, [1, wpEncoded.length])

//     // prepare feeds. use model input names as keys.
//     const feeds = { input_ids: ids, attention_mask: attention }

//     // feed inputs and run
//     const results = await session.run(feeds)
//     console.log(results)
//     // read from results
//     const embedding = results.output_0.data
//     const size = results.output_0.dims
//     console.log(`Embeddings : ${embedding}`)
//     console.log(`Size : ${size}`)
//   } catch (e) {
//     console.error(`failed to inference ONNX model: ${e}.`)
//   }
// }

// main()
