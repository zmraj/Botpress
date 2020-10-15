import fs from 'fs'
import { add, divide, multiply, norm, subtract } from 'mathjs'
import path from 'path'

import { Embedder } from '../../../../src/bp/ml/embedder/embedder'

import { hash_str } from './tools'
import { kb_entry } from './typings'

export async function rerank(content: kb_entry[], embedder: Embedder) {
  const reranked = [...content]
  for (const entry of reranked) {
    for (const question of entry.feedbacks.filter(x => x.polarity)) {
      if (!question.reranked) {
        const question_emb = await embedder.embed(question.utterance)
        const question_emb_norm = multiply(question_emb, divide(norm(entry.embedding), norm(question_emb)))
        const direction = subtract(question_emb_norm, entry.embedding)
        entry.embedding = add(entry.embedding, multiply(0.1, direction))
        entry.embedding = multiply(entry.embedding, divide(norm(question_emb_norm), norm(entry.embedding)))
        question.reranked = true
      }
    }
  }

  const data = JSON.stringify(content)

  fs.writeFileSync(
    path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name, 'qna_reranked.json'),
    data
  )
  return reranked
}
