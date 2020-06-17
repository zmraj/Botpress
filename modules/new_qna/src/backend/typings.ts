export type Answer = {
  context: string
  answer: string
}

export type feedback = {
  utterance: string
  // utterance_embed: number[]
  polarity: number
  approved: true
}

export type kb_entry = {
  title: string
  title_embed: number[]
  content: string[]
  content_embed: number[][]
  contexts: string[]
  feedback: feedback[]
}
