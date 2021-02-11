import _ from 'lodash'
import { makeTestUtterance } from 'nlu-core/test-utils/fake-utterance'

import { Intent } from '../typings'
import Utterance from '../utterance/utterance'

import { ExactIntenClassifier } from './exact-intent-classifier'
import { ModelLoadingError } from 'nlu-core/errors'

const u1 = 'Hi my name is Alex W and I try to make NLU for a living'
const u2 = "Hi I'm Justine and I'm a smart bot with very scoped skills"
const u3 = 'Medication makes me high'

const intent1: Intent<Utterance> = {
  name: 'intent1',
  contexts: ['global'],
  slot_definitions: [],
  utterances: [u1, u2].map(makeTestUtterance)
}

const intent2: Intent<Utterance> = {
  name: 'intent2',
  contexts: ['global', 'marijane'],
  slot_definitions: [],
  utterances: [makeTestUtterance(u3)]
}

describe('Exact match', () => {
  const intents = [intent1, intent2]

  const exactMatchIntentClf = new ExactIntenClassifier()
  const dummyProgress = () => {}

  describe('Build exact match index', () => {
    test('when no match clf returns an empty array', async () => {
      await exactMatchIntentClf.train(
        {
          intents,
          languageCode: 'en',
          list_entities: [],
          pattern_entities: [],
          nluSeed: 42
        },
        dummyProgress
      )

      const { intents: prediction } = await exactMatchIntentClf.predict(makeTestUtterance('Some random string'))

      const actualValues = prediction.map(p => p.confidence)
      expect(actualValues).toEqual([])
    })

    test('when match clf returns length 1 vector', async () => {
      await exactMatchIntentClf.train(
        {
          intents,
          languageCode: 'en',
          list_entities: [],
          pattern_entities: [],
          nluSeed: 42
        },
        dummyProgress
      )

      const pairs: [string, Intent<Utterance>][] = [
        [u1, intent1],
        [u2, intent1],
        [u3, intent2]
      ]

      for (const [u, i] of pairs) {
        const { intents } = await exactMatchIntentClf.predict(makeTestUtterance(u))

        expect(intents.length).toBe(1)
        expect(intents[0].confidence).toBe(1)
      }
    })

    // This test is dependant of utterance.toString() implementation. Ideally we would mock the utterance class.
    test('clf matches even when casing or special characters', async () => {
      await exactMatchIntentClf.train(
        {
          intents,
          languageCode: 'en',
          list_entities: [],
          pattern_entities: [],
          nluSeed: 42
        },
        dummyProgress
      )

      const u1_hat = 'hi mY nAMe is Alex W and I try to maKe nLu for a living' // case insensitive
      const u2_hat = 'Hi I_m Justine and I_m a smart bot with very scoped skills' // ignore special characters
      const u3_hat = 'Medication makes me high ¿÷≥≤µ˜∫√≈æ' // ignore special characters

      const pairs: [string, Intent<Utterance>][] = [
        [u1_hat, intent1],
        [u2_hat, intent1],
        [u3_hat, intent2]
      ]

      for (const [u, i] of pairs) {
        const { intents } = await exactMatchIntentClf.predict(makeTestUtterance(u))
        expect(intents.length).toBe(1)
        expect(intents[0].confidence).toBe(1)
      }
    })

    test('When no model corruption, loading a model doesnt throw', async () => {
      // arrange
      await exactMatchIntentClf.train(
        {
          intents,
          languageCode: 'en',
          list_entities: [],
          pattern_entities: [],
          nluSeed: 42
        },
        dummyProgress
      )
      const model = exactMatchIntentClf.serialize()

      // act
      await exactMatchIntentClf.load(model)

      // assert
      const { intents: predictions } = await exactMatchIntentClf.predict(makeTestUtterance(u1))
      const actual = predictions.find(p => p.name === intent1.name)
      expect(actual?.confidence).toBe(1)
    })

    test('When model is corrupted, loading a model throws', async () => {
      // arrange
      await exactMatchIntentClf.train(
        {
          intents,
          languageCode: 'en',
          list_entities: [],
          pattern_entities: [],
          nluSeed: 42
        },
        dummyProgress
      )
      let model = exactMatchIntentClf.serialize()
      model += 'heyhey I will kill this model'

      // act
      await expect(exactMatchIntentClf.load(model)).rejects.toThrowError(ModelLoadingError)
    })
  })
})