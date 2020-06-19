import fse from 'fs-extra'
import { func } from 'joi'
import { similarity } from 'ml-distance'
import path from 'path'

import { feedback, kb_entry } from './typings'

async function compute_confidence(chunk: kb_entry, question_emb: number[], embedder) {
  const score_chunk: number = similarity.cosine(chunk.embedding, question_emb)
  let score_questions: number = 0
  const positives_questions = chunk.feedbacks.filter(e => e.polarity > 0)
  for (const q of positives_questions) {
    const q_emb = await embedder.embed(q.utterance)
    score_questions += similarity.cosine(q_emb, question_emb)
  }
  score_questions /= positives_questions.length
  // console.log(score_questions, score_chunk)
  return score_chunk + score_questions
}

export async function inferQuestion(question, content, embedder) {
  if (!content.length) {
    console.log('Content not found : Loading content')
    content = await fse.readJSON(path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name, 'qna.json'))
  }
  const question_emb = await embedder.embed(question)
  const scored_content = []
  for (const c of content) {
    const confidence = await compute_confidence(c, question_emb, embedder)
    scored_content.push(Object.assign(c, { confidence }))
  }
  const top = scored_content
    .sort(function(a, b) {
      return a.confidence - b.confidence
    })
    .slice(-3)
  return top
}

export async function electClosestQuestions(question, content, embedder) {
  if (!content.length) {
    console.log('Content not found : Loading content')
    content = await fse.readJSON(path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name, 'qna.json'))
  }
  console.log(question)
  const question_emb = await embedder.embed(question)
  const scored_questions = []
  const q_done = []
  for (const c of content) {
    for (const q of c.feedbacks) {
      if (!q_done.includes(q.utterance)) {
        const q_emb = await embedder.embed(q.utterance)
        scored_questions.push({ utterance: q.utterance, confidence: similarity.cosine(question_emb, q_emb) })
        q_done.push(q.utterance)
      }
    }
  }
  const top = scored_questions
    .sort(function(a, b) {
      return a.confidence - b.confidence
    })
    .slice(-10)
  console.log(scored_questions.slice(0, 10))
  console.log(scored_questions.slice(-10))
  return top
}
