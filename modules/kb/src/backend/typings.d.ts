import { Config } from 'src/config'
import Storage from './storage'

export interface Entry {
  id: string
  version: number
  updated_on: Date
  title: {
    [lang: string]: string
  }
  feedback: {
    [lang: string]: Feedback[]
  }
  content: {
    [lang: string]: string[]
  }
  source: {
    [lang: string]: string
  }
}

export interface Feedback {
  utterance: string
  polarity: boolean // +1 / -1 -> true / false
  approved: boolean
  approved_by: string
  approved_ts: string
  created_by: string
  created_ts: Date
}

export interface ScopedBots {
  [botId: string]: BotParams
}

export interface Model {
  // readonly modelType: string // if we have more than remote model later
  train(data: Entry[]): Promise<boolean>
  cancelTraining(): void
  predict(input: string, langCode: string): Promise<Prediction[]>
  toJSON(): string
}

export interface Prediction {
  title: string
  content: string
  confidence: number
  entry_id: string
  highlight_start: number
  highlight_end: number
  answer: string
  answerSnippet: string
}

export interface BotParams {
  config: Config
  storage: Storage
  defaultLang: string
  loadedModel: Model | undefined
  trainingModel: Model | undefined
}
