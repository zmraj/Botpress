import Joi, { validate } from 'joi'
import _ from 'lodash'
import { ModelLoadingError } from 'nlu-core/errors'
import { Intent } from 'nlu-core/typings'
import Utterance, { UtteranceToStringOptions } from 'nlu-core/utterance/utterance'

import { IntentClassifier, IntentPredictions, IntentTrainInput } from './intent-classifier'

interface Model {
  intents: string[]
  exact_match_index: ExactMatchIndex
}

type ExactMatchIndex = _.Dictionary<{ intent: string }>

const EXACT_MATCH_STR_OPTIONS: UtteranceToStringOptions = {
  lowerCase: true,
  onlyWords: true,
  slots: 'keep-value', // slot extraction is done in || with intent prediction
  entities: 'keep-name'
}

const modelSchema = Joi.object().keys({
  intents: Joi.array().items(Joi.string()),
  exact_match_index: Joi.object().pattern(/^/, Joi.object().keys({ intent: Joi.string() }))
})

const COMPONENT_NAME = 'Exact Intent Classifier'

export class ExactIntenClassifier implements IntentClassifier {
  private model: Model | undefined

  async train(trainInput: IntentTrainInput, progress: (p: number) => void) {
    const { intents } = trainInput
    const exact_match_index = this._buildExactMatchIndex(intents)

    this.model = {
      intents: intents.map(i => i.name),
      exact_match_index
    }
    progress(1)
  }

  private _buildExactMatchIndex = (intents: Intent<Utterance>[]): ExactMatchIndex => {
    return _.chain(intents)
      .flatMap(i =>
        i.utterances.map(u => ({
          utterance: u.toString(EXACT_MATCH_STR_OPTIONS),
          contexts: i.contexts,
          intent: i.name
        }))
      )
      .filter(({ utterance }) => !!utterance)
      .reduce((index, { utterance, intent }) => {
        index[utterance] = { intent }
        return index
      }, {} as ExactMatchIndex)
      .value()
  }

  async serialize() {
    if (!this.model) {
      throw new Error(`${COMPONENT_NAME} must be trained before calling serialize`)
    }
    return JSON.stringify(this.model)
  }

  async load(serialized: string) {
    try {
      const raw = JSON.parse(serialized)
      const model: Model = await validate(raw, modelSchema)

      this.model = model
    } catch (err) {
      throw new ModelLoadingError(COMPONENT_NAME, err)
    }
  }

  async predict(utterance: Utterance): Promise<IntentPredictions> {
    if (!this.model) {
      throw new Error(`${COMPONENT_NAME} must be trained before you call predict on it.`)
    }

    const { exact_match_index, intents: intentNames } = this.model
    const exactPred = this._findExactIntent(exact_match_index, utterance)

    const intents = intentNames.map(name => {
      const confidence = exactPred && exactPred === name ? 1 : 0
      return { name, confidence, extractor: 'exact-matcher' }
    })

    return {
      intents
    }
  }

  private _findExactIntent(exactMatchIndex: ExactMatchIndex, utterance: Utterance): string | undefined {
    const candidateKey = utterance.toString(EXACT_MATCH_STR_OPTIONS)
    const maybeMatch = exactMatchIndex[candidateKey]
    if (maybeMatch) {
      return maybeMatch.intent
    }
  }
}
