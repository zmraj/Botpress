import fse from 'fs-extra'
import { func } from 'joi'
import _ from 'lodash'
import { similarity } from 'ml-distance'
import path from 'path'

import { questions } from './questions'
import { feedback, kb_entry } from './typings'

async function compute_confidence(chunk: kb_entry, question_emb: number[], embedder) {
  const score_chunk: number = similarity.cosine(chunk.embedding, question_emb)
  // let score_questions: number = 0
  const max_score_questions: number = 0
  // const positives_questions = chunk.feedbacks.filter(e => e.polarity > 0)
  // for (const q of positives_questions) {
  //   const q_emb = await embedder.embed(q.utterance)
  //   const sim = similarity.cosine(q_emb, question_emb)
  //   score_questions += sim
  //   if (sim > max_score_questions) {
  //     max_score_questions = sim
  //   }
  // }
  // score_questions /= positives_questions.length
  return score_chunk + max_score_questions
}

export async function inferQuestion(question, state) {
  const question_emb = await state.embedder.embed(question)
  const ctx = await state.contextizer.predict(question_emb)
  const scored_bm25 = state.bm25_index.search(question)
  const max_score_mb25 = Math.max.apply(
    Math,
    scored_bm25.map(o => {
      return o.score
    })
  )

  const scored_content = []
  for (const c of state.content) {
    if (c.contexts.includes(ctx)) {
      let confidence = await compute_confidence(c, question_emb, state.embedder)
      confidence *= 5
      // let confidence = 0
      const boostBM25 = scored_bm25.filter(obj => obj.key === c.key)
      if (boostBM25.length) {
        confidence += boostBM25[0].score / max_score_mb25
      }
      scored_content.push(Object.assign(c, { confidence }))
    }
  }

  const top = scored_content
    .sort(function(a, b) {
      return a.confidence - b.confidence
    })
    .slice(-3)
  if (!top.length) {
    console.log(top, ctx, question)
  }
  return top
}

export async function electClosestQuestions(question, state) {
  const question_emb = await state.embedder.embed(question)
  const scored_questions = []
  const q_done = []

  for (const c of state.content) {
    for (const q of c.feedbacks) {
      if (!q_done.includes(q.utterance)) {
        const q_emb = await state.embedder.embed(q.utterance)
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
  return top
}

export async function runTests(state) {
  const results = []

  for (const q of questions) {
    const top_k = await inferQuestion(q[0], state)
    results.push({
      question: q[0],
      bp_bot: q[1],
      deep_bot: top_k[top_k.length - 1].content,
      bp_right: false,
      deep_right: false
    })
  }
  return results
}
