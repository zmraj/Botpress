import { MLToolkit, NLU } from 'botpress/sdk'
import * as sdk from 'botpress/sdk'
import crypto from 'crypto'
import _ from 'lodash'

import * as CacheManager from '../core/services/nlu/cache-manager'

const trainDebug = DEBUG('nlu').sub('training')

export default class Engine implements NLU.Engine {
  constructor(private defaultLanguage: string, private botId: string, private logger: NLU.Logger) { }

  public static getHealth() {
  }

  public static getLanguages() {
  }

  public static async initialize(config: NLU.Config, logger: NLU.Logger): Promise<void> {
    // Load good model for lang
  }

  public hasModel(language: string, hash: string) {
    return false
  }

  public computeModelHash(intents: NLU.IntentDefinition[], entities: NLU.EntityDefinition[], lang: string): string {
    return 'String'
  }

  async train(
    intentDefs: NLU.IntentDefinition[],
    entityDefs: NLU.EntityDefinition[],
    languageCode: string,
    trainingSession?: NLU.TrainingSession,
    options?: NLU.TrainingOptions
  ): Promise<NLU.Model | undefined> {
    trainDebug.forBot(this.botId, `Started ${languageCode} training`)
    return undefined
  }

  async loadModel(serialized: NLU.Model | undefined) {
    return undefined
  }

  async predict(sentence: string, includedContexts: string[]): Promise<sdk.IO.EventUnderstanding> {
    return {
      intent: {
        name: 'string',
        confidence: 123,
        context: 'string',
        matches: (intentPattern: string) => false
      },
      /** Predicted intents needs disambiguation */
      ambiguous: false,
      intents: [{
        name: 'string',
        confidence: 123,
        context: 'string',
        matches: (intentPattern: string) => false
      }],
      /** The language used for prediction. Will be equal to detected language when its part of supported languages, falls back to default language otherwise */
      language: 'string',
      /** Language detected from users input. */
      detectedLanguage: 'string',
      entities: [{
        name: 'string',
        type: 'string',
        meta: {
          sensitive: false,
          confidence: 123,
          provider: 'string',
          source: 'string',
          start: 123,
          end: 1234,
          raw: 'any',
        },
        data: {
          extras: 'any',
          value: 'any',
          unit: 'string',
        }
      }],
      slots: {
        'String': {
          name: 'string',
          value: 'any',
          source: 'any',
          entity: {
            name: 'string',
            type: 'string',
            meta: {
              sensitive: false,
              confidence: 123,
              provider: 'string',
              source: 'string',
              start: 123,
              end: 1234,
              raw: 'any',
            },
            data: {
              extras: 'any',
              value: 'any',
              unit: 'string',
            }
          },
          confidence: 123,
          start: 1324,
          end: 2134,
        }
      },
      errored: false,
      includedContexts: ['string'],
      predictions: {
        '[context: string]': {
          confidence: 123,
          oos: 132,
          intents: [{
            label: 'string',
            confidence: 456,
            slots: {
              'Plop': {
                name: 'string',
                value: 'any',
                source: 'any',
                entity: {
                  name: 'string',
                  type: 'string',
                  meta: {
                    sensitive: false,
                    confidence: 456,
                    provider: 'string',
                    source: 'string',
                    start: 564163,
                    end: 564,
                    raw: 'any',
                  },
                  data: {
                    extras: 'any',
                    value: 'any',
                    unit: 'string',
                  }
                },
                confidence: 123,
                start: 132,
                end: 654,
              }
            },
            extractor: 'classifier',
          }]
        }
      },
      ms: 123,
      suggestedLanguage: 'string',
    }
  }

}
