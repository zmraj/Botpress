import fse from 'fs-extra'
import { similarity } from 'ml-distance'
import path from 'path'

import { questions } from './questions'

export async function runTests(content, embedder) {
  const results = []
  for (const q of questions.slice(0, 2)) {
    if (!content.length) {
      console.log('Content not found : Loading content')
      content = await fse.readJSON(
        path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name, 'qna.json')
      )
    }
    const question_emb = await embedder.embed(q[0])
    const scored_content = content.map(c =>
      Object.assign(c, { confidence: similarity.cosine(c.embedding, question_emb) })
    )
    const top = scored_content
      .sort(function(a, b) {
        return a.confidence - b.confidence
      })
      .slice(-1)
    results.push({
      question: q[0],
      bp_bot: q[1],
      deep_bot: top[0].content,
      bp_right: false,
      deep_right: false
    })
  }
  return results
}
