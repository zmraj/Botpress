import * as sdk from 'botpress/sdk'
import fse from 'fs-extra'
import Joi, { validate } from 'joi'
import _ from 'lodash'
import { ModelLoadingError } from 'nlu-core/errors'
import { getEntitiesAndVocabOfIntent } from 'nlu-core/intents/intent-vocab'
import tmp from 'tmp'

import { BIO, Intent, ListEntityModel, SlotDefinition, SlotExtractionResult, Tag, Tools } from '../typings'
import Utterance, { UtteranceToken } from '../utterance/utterance'

import { SlotDefinitionSchema } from './schemas'
import * as featurizer from './slot-featurizer'

export interface TagResult {
  tag: Tag | string
  name: string
  probability: number
}

const debugTrain = DEBUG('nlu').sub('training')
const debugExtract = DEBUG('nlu').sub('extract')

const CRF_TRAINER_PARAMS = {
  c1: '0.0001',
  c2: '0.01',
  max_iterations: '500',
  'feature.possible_transitions': '1',
  'feature.possible_states': '1'
}

const MIN_SLOT_CONFIDENCE = 0.15

export function labelizeUtterance(utterance: Utterance): string[] {
  return utterance.tokens
    .filter(x => !x.isSpace)
    .map(token => {
      if (_.isEmpty(token.slots)) {
        return BIO.OUT
      }

      const slot = token.slots[0]
      const tag = slot.startTokenIdx === token.index ? BIO.BEGINNING : BIO.INSIDE
      const any = _.isEmpty(token.entities) ? '/any' : ''

      return `${tag}-${slot.name}${any}`
    })
}

function predictionLabelToTagResult(prediction: { [label: string]: number }): TagResult {
  const pairedPreds = _.chain(prediction)
    .mapValues((value, key) => value + (prediction[`${key}/any`] || 0))
    .toPairs()
    .value()

  if (!pairedPreds.length) {
    throw new Error('there should be at least one prediction when converting predictions to tag result')
  }
  const [label, probability] = _.maxBy(pairedPreds, x => x[1])!

  return {
    tag: label[0],
    name: label.slice(2).replace('/any', ''),
    probability
  } as TagResult
}

function removeInvalidTagsForIntent(slot_definitions: SlotDefinition[], tag: TagResult): TagResult {
  if (tag.tag === BIO.OUT) {
    return tag
  }

  const foundInSlotDef = !!slot_definitions.find(s => s.name === tag.name)

  if (tag.probability < MIN_SLOT_CONFIDENCE || !foundInSlotDef) {
    tag = {
      tag: BIO.OUT,
      name: '',
      probability: 1 - tag.probability // anything would do here
    }
  }

  return tag
}

export function makeExtractedSlots(
  slot_entities: string[],
  utterance: Utterance,
  slotTagResults: TagResult[]
): SlotExtractionResult[] {
  return _.zipWith(
    utterance.tokens.filter(t => !t.isSpace),
    slotTagResults,
    (token, tagRes) => ({ token, tagRes })
  )
    .filter(({ tagRes }) => tagRes.tag !== BIO.OUT)
    .reduce((combined, { token, tagRes }) => {
      const last = _.last(combined)
      const shouldConcatWithPrev = tagRes.tag === BIO.INSIDE && _.get(last, 'slot.name') === tagRes.name

      if (shouldConcatWithPrev && last) {
        const newEnd = token.offset + token.value.length
        const newSource = utterance.toString({ entities: 'keep-default' }).slice(last.start, newEnd) // we use slice in case tokens are space split
        last.slot.source = newSource
        last.slot.value = newSource
        last.end = newEnd

        return [...combined.slice(0, -1), last]
      } else {
        return [
          ...combined,
          {
            slot: {
              name: tagRes.name,
              confidence: tagRes.probability,
              source: token.toString(),
              value: token.toString()
            },
            start: token.offset,
            end: token.offset + token.value.length
          }
        ]
      }
    }, [] as SlotExtractionResult[])
    .map((extracted: SlotExtractionResult) => {
      const associatedEntityInRange = utterance.entities.find(
        e =>
          ((e.startPos <= extracted.start && e.endPos >= extracted.end) || // slot is fully contained by an entity
            (e.startPos >= extracted.start && e.endPos <= extracted.end)) && // entity is fully within the tagged slot
          _.includes(slot_entities, e.type) // entity is part of the possible entities
      )
      if (associatedEntityInRange) {
        extracted.slot.entity = {
          ..._.omit(associatedEntityInRange, 'startPos', 'endPos', 'startTokenIdx', 'endTokenIdx'),
          start: associatedEntityInRange.startPos,
          end: associatedEntityInRange.endPos
        }
        extracted.slot.value = associatedEntityInRange.value
      }
      return extracted
    })
}

export interface IntentSlotFeatures {
  name: string
  vocab: string[]
  slot_entities: string[]
}

interface TrainInput {
  intent: Intent<Utterance>
  list_entites: ListEntityModel[]
}

interface Model {
  crfModel: Buffer | undefined
  intentFeatures: IntentSlotFeatures
  slot_definitions: SlotDefinition[]
}

interface Predictors {
  crfTagger: sdk.MLToolkit.CRF.Tagger | undefined
  intentFeatures: IntentSlotFeatures
  slot_definitions: SlotDefinition[]
}

const intentSlotFeaturesSchema = Joi.object().keys({
  name: Joi.string(),
  vocab: Joi.array().items(Joi.string()),
  slot_entities: Joi.array().items(Joi.string())
})

const modelSchema = Joi.object().keys({
  crfModel: Joi.string().optional(), // this is a string when serialized
  intentFeatures: intentSlotFeaturesSchema,
  slot_definitions: Joi.array().items(SlotDefinitionSchema)
})

const COMPONENT_NAME = 'CRF Slot Tagger'

export default class SlotTagger {
  private model: Model | undefined
  private predictors: Predictors | undefined
  private mlToolkit: typeof sdk.MLToolkit

  constructor(tools: Tools) {
    this.mlToolkit = tools.mlToolkit
  }

  async load(serialized: string) {
    try {
      const raw = JSON.parse(serialized)
      const model: Model = await validate(raw, modelSchema)

      model.crfModel = model.crfModel && Buffer.from(model.crfModel)

      this.predictors = this._makePredictors(model)
      this.model = model
    } catch (err) {
      throw new ModelLoadingError(COMPONENT_NAME, err)
    }
  }

  private _makePredictors(model: Model): Predictors {
    const { intentFeatures, crfModel, slot_definitions } = model
    const crfTagger = crfModel && this._makeCrfTagger(crfModel)

    return {
      crfTagger,
      intentFeatures,
      slot_definitions
    }
  }

  private _makeCrfTagger(crfModel: Buffer) {
    const crfModelFn = tmp.tmpNameSync()
    fse.writeFileSync(crfModelFn, crfModel)
    const crfTagger = new this.mlToolkit.CRF.Tagger()
    crfTagger.open(crfModelFn)
    return crfTagger
  }

  async serialize(): Promise<string> {
    if (!this.model) {
      throw new Error(`${COMPONENT_NAME} must be trained before calling serialize`)
    }
    return JSON.stringify(this.model)
  }

  async train(trainSet: TrainInput, progress: (p: number) => void): Promise<void> {
    debugTrain('Started Slot tagger training')

    const { intent, list_entites } = trainSet
    const intentFeatures = getEntitiesAndVocabOfIntent(intent, list_entites)
    const { slot_definitions } = intent

    if (slot_definitions.length <= 0) {
      // TODO: prevent from persisting to much bytes when theres no slots
      this.model = {
        crfModel: undefined,
        intentFeatures,
        slot_definitions
      }
      progress(1)
      return
    }

    const elements: sdk.MLToolkit.CRF.DataPoint[] = []

    for (const utterance of intent.utterances) {
      const features: string[][] = utterance.tokens
        .filter(x => !x.isSpace)
        .map(this.tokenSliceFeatures.bind(this, intentFeatures, utterance, false))
      const labels = labelizeUtterance(utterance)

      elements.push({ features, labels })
    }

    const trainer = new this.mlToolkit.CRF.Trainer()
    const crfModelFn = await trainer.train(elements, CRF_TRAINER_PARAMS)

    const crfModel = await fse.readFile(crfModelFn)

    this.model = {
      crfModel,
      intentFeatures,
      slot_definitions
    }

    progress(1)

    debugTrain('Done with Slot tagger training')
  }

  private tokenSliceFeatures(
    intent: IntentSlotFeatures,
    utterance: Utterance,
    isPredict: boolean,
    token: UtteranceToken
  ): string[] {
    const previous = utterance.tokens.filter(t => t.index < token.index && !t.isSpace).slice(-2)
    const next = utterance.tokens.filter(t => t.index > token.index && !t.isSpace).slice(0, 1)

    const prevFeats = previous.map(t =>
      this._getTokenFeatures(intent, utterance, t, isPredict)
        .filter(f => f.name !== 'quartile')
        .reverse()
    )
    const current = this._getTokenFeatures(intent, utterance, token, isPredict).filter(f => f.name !== 'cluster')
    const nextFeats = next.map(t =>
      this._getTokenFeatures(intent, utterance, t, isPredict).filter(f => f.name !== 'quartile')
    )

    const prevPairs = prevFeats.length
      ? featurizer.getFeatPairs(prevFeats[0], current, ['word', 'vocab', 'weight', 'POS'])
      : []
    const nextPairs = nextFeats.length
      ? featurizer.getFeatPairs(current, nextFeats[0], ['word', 'vocab', 'weight', 'POS'])
      : []

    const intentFeat = featurizer.getIntentFeature(intent.name)
    const bos = token.isBOS ? ['__BOS__'] : []
    const eos = token.isEOS ? ['__EOS__'] : []

    return [
      ...bos,
      featurizer.featToCRFsuiteAttr('', intentFeat),
      ..._.flatten(prevFeats.map((feat, idx) => feat.map(featurizer.featToCRFsuiteAttr.bind(this, `w[-${idx + 1}]`)))),
      ...current.map(featurizer.featToCRFsuiteAttr.bind(this, 'w[0]')),
      ..._.flatten(nextFeats.map((feat, idx) => feat.map(featurizer.featToCRFsuiteAttr.bind(this, `w[${idx + 1}]`)))),
      ...prevPairs.map(featurizer.featToCRFsuiteAttr.bind(this, 'w[-1]|w[0]')),
      ...nextPairs.map(featurizer.featToCRFsuiteAttr.bind(this, 'w[0]|w[1]')),
      ...eos
    ] as string[]
  }

  private _getTokenFeatures(
    intent: IntentSlotFeatures,
    utterance: Utterance,
    token: UtteranceToken,
    isPredict: boolean
  ): featurizer.CRFFeature[] {
    if (!token || !token.value) {
      return []
    }

    return [
      featurizer.getTokenQuartile(utterance, token),
      featurizer.getClusterFeat(token),
      featurizer.getWordWeight(token),
      featurizer.getInVocabFeat(token, intent.vocab),
      featurizer.getSpaceFeat(utterance.tokens[token.index - 1]),
      featurizer.getAlpha(token),
      featurizer.getNum(token),
      featurizer.getSpecialChars(token),
      featurizer.getWordFeat(token, isPredict),
      featurizer.getPOSFeat(token),
      ...featurizer.getEntitiesFeats(token, intent.slot_entities ?? [], isPredict)
    ].filter(_.identity) as featurizer.CRFFeature[] // some features can be undefined
  }

  private _getSequenceFeatures(intent: IntentSlotFeatures, utterance: Utterance, isPredict: boolean): string[][] {
    return _.chain(utterance.tokens)
      .filter(t => !t.isSpace)
      .map(t => this.tokenSliceFeatures(intent, utterance, isPredict, t))
      .value()
  }

  async predict(utterance: Utterance): Promise<SlotExtractionResult[]> {
    if (!this.predictors) {
      if (!this.model) {
        throw new Error(`${COMPONENT_NAME} must be trained before calling predict.`)
      }

      this.predictors = this._makePredictors(this.model)
    }

    const { intentFeatures, crfTagger, slot_definitions } = this.predictors

    if (!crfTagger) {
      return []
    }

    const features = this._getSequenceFeatures(intentFeatures, utterance, true)
    debugExtract('vectorize', features)

    const predictions = crfTagger.marginal(features)
    debugExtract('slot crf predictions', predictions)

    return _.chain(predictions)
      .map(predictionLabelToTagResult)
      .map(tagRes => removeInvalidTagsForIntent(slot_definitions, tagRes))
      .thru(tagRess => makeExtractedSlots(intentFeatures.slot_entities, utterance, tagRess))
      .value() as SlotExtractionResult[]
  }
}
