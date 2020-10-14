import fse from 'fs-extra'
import { func } from 'joi'
import _ from 'lodash'
import { similarity } from 'ml-distance'
import path from 'path'
import axios from 'axios'
import { questions } from './questions'
import { feedback, kb_entry } from './typings'
import { database } from 'botpress/sdk'
import gouv_questions from '../../datas/raw/gouv_results.json'

function isQuickReply(x) {
  return x.type === 'custom' && x.component === 'QuickReplies'
}
function isInfoSource(x) {
  return x.type === 'custom' && x.component === 'InfoSource'
}
function mapInfoSource(wrapped) {
  return wrapped.question + '\n' + wrapped.text
}

async function compute_confidence(chunk: kb_entry, question_emb: number[], embedder) {
  const score_chunk: number = similarity.cosine(chunk.embedding, question_emb)
  let score_questions: number = 0
  let max_score_questions: number = 0
  const positives_questions = chunk.feedbacks.filter(e => e.polarity > 0)
  for (const q of positives_questions) {
    const q_emb = await embedder.embed(q.utterance)
    const sim = similarity.cosine(q_emb, question_emb)
    score_questions += sim
    if (sim > max_score_questions) {
      max_score_questions = sim
    }
  }
  score_questions /= positives_questions.length
  return score_chunk + max_score_questions
}

export async function inferQuestion(question, state, axiosConfig) {
  axiosConfig.baseURL = 'http://localhost:3000/api/v1/bots/plop/'
  const { data: { nlu } } = await axios.post(
    'mod/nlu/predict',
    {
      text: question[0],
      contexts: [question[2]]
    },
    axiosConfig
  )

  const pred = _.chain(nlu.predictions)
    .toPairs()
    .flatMap(([ctx, ctxPredObj]) => {
      return ctxPredObj.intents.map(intentPred => {
        const oosFactor = ctx === 'oos' ? 1 : 1 - nlu.predictions.oos.confidence
        return {
          contexts: [ctx],
          orig: "BP",
          feedbacks: [],
          label: intentPred.label,
          confidence: intentPred.confidence * oosFactor * ctxPredObj.confidence // copy pasted from ndu conditions.ts (now how we elect intent)
        }
      })
    })
    .maxBy('confidence')
    .value()

  // const { data: result } = await axios.post(
  //   'https://covid-qc-trainer.botpress.cloud/api/v1/bots/covid/converse/lol/',
  //   { type: 'text', text: question }
  // )
  // const response = ((result && result.responses) || [])
  //   .map(x => {
  //     if (x.type === 'text') {
  //       return x.text
  //     }
  //     if (isInfoSource(x)) {
  //       return mapInfoSource(x)
  //     }
  //     if (isQuickReply(x)) {
  //       return mapInfoSource(x.wrapped)
  //     }
  //   })
  //   .filter(x => !!x)
  //   .join('\n')

  if (pred.confidence > 0.47) {
    return [{ ...pred, content: question[1], winner: "botpress", deep_confidence: 0 }]
  } else {
    const question_emb = await state.embedder.embed(question[0])
    const ctx = pred.contexts[0]
    const scored_bm25 = state.bm25_index.search(question[0])
    const max_score_mb25 = Math.max.apply(Math, scored_bm25.map(o => { return o.score }))
    debugger;
    const scored_content = []
    for (const c of state.content) {
      if (c.contexts.includes(ctx) || ctx === "Smalltalk" || ctx === 'oos' || ctx === 'Autres questions') {
        let confidence = await compute_confidence(c, question_emb, state.embedder)
        // confidence *= 5
        // let confidence = 0
        const boostBM25 = scored_bm25.filter(obj => obj.key === c.key)
        if (boostBM25.length) {
          confidence = 2 * confidence + (boostBM25[0].score / max_score_mb25)
        }
        confidence /= 3
        scored_content.push({ ...c, deep_confidence: confidence, confidence: pred.confidence })
      }
    }

    const top = scored_content
      .sort(function (a, b) {
        return a.deep_confidence - b.deep_confidence
      })
      .slice(-1)
    if (!top.length) {
      console.log(top, ctx, question)
    }
    top[0].winner = "deep"
    top[0].deep_confidence
    return top
  }
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
    .sort(function (a, b) {
      return a.confidence - b.confidence
    })
    .slice(-10)
  return top
}

export async function runTests(state, axiosConfig) {
  console.log("Running tests")
  const results = []

  const questions = gouv_questions.sort(() => Math.random() - 0.5).map(o => [o.Question, o.botpress, o.Categorie]).slice(0, 120)

  for (const q of questions) {
    // console.log(q)
    const top_k = await inferQuestion(q, state, axiosConfig)
    const uniq = top_k[top_k.length - 1]
    results.push({
      question: q[0],
      bp_bot: q[1],
      deep_bot: uniq.content,
      bp_right: false,
      deep_right: false,
      winner: uniq.winner,
      confidence: uniq.confidence,
      deep_confidence: uniq.deep_confidence
    })
  }
  return results
}
