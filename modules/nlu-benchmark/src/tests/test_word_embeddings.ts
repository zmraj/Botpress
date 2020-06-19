import { get } from 'lodash'

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

// async function cosine_sim_test(phrase1: string, phrase2: string) {
//   const embed_p1: number[] = await embed(phrase1)
//   const embed_p2: number[] = await embed(phrase2)
//   console.log(cosine(embed_p1, embed_p2))
// }
const synonyms = [
  ['golf', 'natation'],
  ['chien', 'chat'],
  ['voiture', 'moto'],
  ['table', 'arbre'],
  ['nuage', 'ciel'],
  ['maman', 'papa'],
  ['citrouille', 'route']
]
export async function test_word_embeddings(models: [string, DeepEmbedder][]) {
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
