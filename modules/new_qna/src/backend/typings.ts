import { id } from 'inversify'

export type Answer = {
  context: string
  answer: string
}

export type feedback = {
  utterance: string
  // utterance_emb: number[]
  polarity: number
  reranked: boolean
}

export type kb_entry = {
  key: string
  orig: string
  content: string
  embedding: number[]
  contexts: string[]
  feedbacks: feedback[]
}
