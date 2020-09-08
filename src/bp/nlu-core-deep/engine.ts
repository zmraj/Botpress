import { MLToolkit, NLU } from 'botpress/sdk'
import * as sdk from 'botpress/sdk'
import crypto from 'crypto'
import _ from 'lodash'
import { Partial } from 'lodash-decorators'

import * as CacheManager from '../core/services/nlu/cache-manager'

import { Net } from './models/deepnet'

const trainDebug = DEBUG('nlu').sub('training')
interface Model {
  hash?: string
  languageCode?: string
  startedAt?: Date
  finishedAt?: Date
  data?: {
    input: string
    output: string
  }
  model?: Net
  trained?: boolean
  saved?: boolean
  loaded?: boolean
}
export default class Engine implements NLU.Engine {
  private modelsByLang: _.Dictionary<Model> = {}

  constructor(private defaultLanguage: string, private botId: string, private logger: NLU.Logger) {}

  public static getHealth() {
    return {
      isEnabled: true,
      validProvidersCount: 1,
      validLanguages: ['en']
    } as sdk.NLU.Health
  }

  public static getLanguages() {
    return ['en']
  }

  public static async initialize(config: NLU.Config, logger: NLU.Logger): Promise<void> {}

  public hasModel(language: string, hash: string) {
    return false
  }

  public computeModelHash(intents: NLU.IntentDefinition[], entities: NLU.EntityDefinition[], lang: string): string {
    return crypto
      .createHash('sha256')
      .update(this.botId)
      .digest('hex')
  }

  async train(
    intentDefs: NLU.IntentDefinition[],
    entityDefs: NLU.EntityDefinition[],
    languageCode: string,
    trainingSession?: NLU.TrainingSession,
    options?: NLU.TrainingOptions
  ): Promise<NLU.Model | undefined> {
    if (!intentDefs.length) {
      return
    }
    trainDebug.forBot(this.botId, `Started ${languageCode} training`)
    const model: Model = this.modelsByLang[languageCode] ?? {}
    if (!model.model) {
      model.model = new Net(languageCode, intentDefs.length)
      model.loaded = true
    }
    if (!model.trained) {
      model.startedAt = new Date()
      await model.model!.train(intentDefs, entityDefs)
      model.finishedAt = new Date()
      model.loaded = true
      model.trained = true
      model.saved = true
    }
    this.modelsByLang[languageCode] = model
    return {
      hash: this.computeModelHash(intentDefs, entityDefs, languageCode),
      languageCode: languageCode,
      startedAt: model.startedAt,
      finishedAt: model.finishedAt,
      data: {
        input: intentDefs.toString(),
        output: model.model!.netPath
      }
    } as NLU.Model
  }

  async loadModel(serialized: NLU.Model | undefined) {
    if (!serialized || !serialized.languageCode) {
      return
    }
    try {
      if (!this.modelsByLang[serialized.languageCode].loaded) {
        this.modelsByLang[serialized.languageCode].model = new Net(
          serialized.languageCode,
          serialized.data.input.length
        )
      }
      await this.modelsByLang[serialized.languageCode].model!.load(serialized.languageCode, serialized.data.output)
      this.modelsByLang[serialized.languageCode].loaded = true
    } catch (e) {
      console.log('ERROR LOADING MODEL : ', e)
      return undefined
    }
  }

  async predict(sentence: string, includedContexts: string[]): Promise<sdk.IO.EventUnderstanding> {
    // TODO Detect language
    await this.modelsByLang[this.defaultLanguage].model!.predict(sentence)
    return {
      language: this.defaultLanguage,
      detectedLanguage: this.defaultLanguage,
      ms: Date.now(),
      errored: false,
      entities: [],
      includedContexts
      //     intent: {
      //       name: 'string',
      //       confidence: 123,
      //       context: 'string',
      //       matches: (intentPattern: string) => false
      //     },
      //     /** Predicted intents needs disambiguation */
      //     ambiguous: false,
      //     intents: [
      //       {
      //         name: 'string',
      //         confidence: 123,
      //         context: 'string',
      //         matches: (intentPattern: string) => false
      //       }
      //     ],
      //     /** The language used for prediction. Will be equal to detected language when its part of supported languages, falls back to default language otherwise */
      //     language: 'string',
      //     /** Language detected from users input. */
      //     detectedLanguage: 'string',
      //     entities: [
      //       {
      //         name: 'string',
      //         type: 'string',
      //         meta: {
      //           sensitive: false,
      //           confidence: 123,
      //           provider: 'string',
      //           source: 'string',
      //           start: 123,
      //           end: 1234,
      //           raw: 'any'
      //         },
      //         data: {
      //           extras: 'any',
      //           value: 'any',
      //           unit: 'string'
      //         }
      //       }
      //     ],
      //     slots: {
      //       String: {
      //         name: 'string',
      //         value: 'any',
      //         source: 'any',
      //         entity: {
      //           name: 'string',
      //           type: 'string',
      //           meta: {
      //             sensitive: false,
      //             confidence: 123,
      //             provider: 'string',
      //             source: 'string',
      //             start: 123,
      //             end: 1234,
      //             raw: 'any'
      //           },
      //           data: {
      //             extras: 'any',
      //             value: 'any',
      //             unit: 'string'
      //           }
      //         },
      //         confidence: 123,
      //         start: 1324,
      //         end: 2134
      //       }
      //     },
      //     errored: false,
      //     includedContexts: ['string'],
      //     predictions: {
      //       '[context: string]': {
      //         confidence: 123,
      //         oos: 132,
      //         intents: [
      //           {
      //             label: 'string',
      //             confidence: 456,
      //             slots: {
      //               Plop: {
      //                 name: 'string',
      //                 value: 'any',
      //                 source: 'any',
      //                 entity: {
      //                   name: 'string',
      //                   type: 'string',
      //                   meta: {
      //                     sensitive: false,
      //                     confidence: 456,
      //                     provider: 'string',
      //                     source: 'string',
      //                     start: 564163,
      //                     end: 564,
      //                     raw: 'any'
      //                   },
      //                   data: {
      //                     extras: 'any',
      //                     value: 'any',
      //                     unit: 'string'
      //                   }
      //                 },
      //                 confidence: 123,
      //                 start: 132,
      //                 end: 654
      //               }
      //             },
      //             extractor: 'classifier'
      //           }
      //         ]
      //       }
      //     },
      //     ms: 123,
      //     suggestedLanguage: 'string'
    }
  }
}
