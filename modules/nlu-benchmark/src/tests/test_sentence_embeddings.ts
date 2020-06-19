import { get } from 'lodash'
import { bertNormalizer } from 'tokenizers/bindings/normalizers'
import { DeepEmbedder } from '../models/embedders/deep_onnx_embedder'

function cosine(a: number[], b: number[]) {
  const ii = a.length
  let p = 0
  let p2 = 0
  let q2 = 0
  for (let i = 0; i < ii; i++) {
    p += a[i] * b[i]
    p2 += a[i] * a[i]
    q2 += b[i] * b[i]
  }
  return p / (Math.sqrt(p2) * Math.sqrt(q2))
}

const synonyms = [
  ["J'aime faire du vélo", "C'est agréable de faire de la bicyclette"],
  ['Je peux aller jouer au baseball ?', 'Je peux aller jouer au football ?'],
  ["Je vais gagner beaucoup d'argent", 'Je vais être riche'],
  ['La carne es mi comida favorida', 'Me gusta comer carne']
]
export async function test_sentence_embeddings(models: [string, DeepEmbedder][]) {
  const res = {}
  res['models'] = models.map(e => e[0])
  res['data'] = {}
  let datas = []
  for (const [model_name, model] of models) {
    for (const [mot, syn] of synonyms) {
      const embed_mot = await model.embed(mot)
      const embed_syn = await model.embed(syn)
      datas = get(res['data'], mot + '/' + syn, [])
      datas.push(cosine(embed_mot, embed_syn))
      res['data'][mot + '/' + syn] = datas
    }
  }
  return res
}
