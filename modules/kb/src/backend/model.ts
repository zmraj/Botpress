import axios, { AxiosInstance } from 'axios'
import retry from 'bluebird-retry'
import fse from 'fs-extra'
import httpsProxyAgent from 'https-proxy-agent'
import _, { debounce, sumBy } from 'lodash'
import lru from 'lru-cache'
import { distance, similarity } from 'ml-distance'
import ms from 'ms'
import path from 'path'

import { sanitizeText } from './storage'
import { Entry, Model, Prediction } from './typings'

const debug = DEBUG('kb').sub('lang')

type Cache = {
  [str: string]: number[]
}

// TODO:
// local cache
// retry axios
// batch get
// get content too
// get

const _vectorsCachePath = path.join(process.APP_DATA_PATH, 'cache', 'mod_kb_vectors.json')
const _vectorsCache: lru<string, Float32Array> = new lru<string, Float32Array>({
  length: (arr: Float32Array) => {
    if (arr && arr.BYTES_PER_ELEMENT) {
      return arr.length * arr.BYTES_PER_ELEMENT
    } else {
      return 768 /* dim */ * Float32Array.BYTES_PER_ELEMENT
    }
  },
  max: 768 /* dim */ * Float32Array.BYTES_PER_ELEMENT /* bytes */ * 10000000 /* 10M sentences */
})

const onVectorsCacheChanged = debounce(async () => {
  if (!this._cacheDumpDisabled) {
    await this.dumpVectorsCache()
  }
}, ms('5s'))

async function dumpVectorsCache() {
  try {
    await fse.ensureFile(this._vectorsCachePath)
    await fse.writeJSON(this._vectorsCachePath, this._vectorsCache.dump())
    debug('vectors cache updated at: %s', this._vectorsCachePath)
  } catch (err) {
    debug('could not persist vectors cache, error: %s', err.message)
    this._cacheDumpDisabled = true
  }
}

async function restoreVectorsCache() {
  try {
    if (await fse.pathExists(this._vectorsCachePath)) {
      const dump = await fse.readJSON(this._vectorsCachePath)
      if (dump) {
        const kve = dump.map(x => ({ e: x.e, k: x.k, v: Float32Array.from(Object.values(x.v)) }))
        this._vectorsCache.load(kve)
      }
    }
  } catch (err) {
    debug('could not restore vectors cache, error: %s', err.message)
  }
}

const ENDPOINT = process.env.BP_MODULE_KB_ENDPOINT || 'https://covid-qc-qna.botpress.cloud'
const getCacheKey = (lang: string, input: string) =>
  `${lang.toLowerCase().trim()}___${encodeURI(sanitizeText(input))
    .toLowerCase()
    .trim()}`

// async function getEmbeddings() {}

export default class RemoteModel implements Model {
  private training = false
  private cancelled = false

  constructor(
    private entries: Entry[] = [],
    private langs: string[] = [],
    private cache: Cache = {},
    private trained: boolean = false
  ) {}

  async train(data: Entry[]): Promise<boolean> {
    if (this.training) {
      throw new Error('Already training')
    }

    if (this.trained) {
      throw new Error('Already trained')
    }

    this.trained = false
    this.cancelled = false
    this.training = true

    try {
      const cache: Cache = {}
      const langs = _.uniq(_.flatten(data.map(x => [...Object.keys(x.content), ...Object.keys(x.title)])))
      const { progress } = (function() {
        let i = 0
        const total = data.length
        const progress = () => {
          const percent = ((i++ / total) * 100).toFixed(1)
          debug(`Progress is ${i} / ${total} (${percent} %)`)
        }
        return { progress }
      })()

      for (const entry of data) {
        if (this.cancelled) {
          break
        }
        for (const lang of langs) {
          if (this.cancelled) {
            break
          }
          const unseen = _.uniq([_.get(entry, 'title.' + lang)].filter(Boolean).map(sanitizeText))
            .filter(Boolean)
            .filter(p => !cache[getCacheKey(lang, p)])

          // const unseen = _.uniq(
          //   [_.get(entry, 'title.' + lang), ..._.get(entry, 'content.' + lang)].filter(Boolean).map(sanitizeText)
          // )
          //   .filter(Boolean)
          //   .filter(p => !cache[getCacheKey(lang, p)])

          for (const p of unseen) {
            if (this.cancelled) {
              break
            }

            // check if local cache has it
            // if not fetch remote + store local + update cache

            try {
              const {
                data: { embeddings }
              } = await axios.post(ENDPOINT + '/embeddings', {
                lang: lang.toLowerCase().trim(),
                text: sanitizeText(p)
              })

              if (!embeddings || !embeddings.length || isNaN(embeddings[0])) {
                throw new Error('Received invalid embeddings')
              }

              cache[getCacheKey(lang, p)] = embeddings
            } catch (err) {
              console.log(err)
            }
          }
        }
        progress()
      }

      if (!this.cancelled) {
        this.entries = data
        this.cache = cache
        this.langs = langs

        this.trained = true
      }
    } catch (err) {
      this.trained = false
      debug('Error training KB', err)
    } finally {
      this.training = false
      this.cancelled = false
      return this.trained
    }
  }

  cancelTraining(): void {
    if (!this.training) {
      throw new Error("Can't cancel training because training has not started")
    }

    this.cancelled = true
  }

  async predict(input: string, langCode: string): Promise<Prediction[]> {
    if (!this.trained) {
      throw new Error("Can't predict because model is not trained")
    }

    if (this.training) {
      throw new Error("Can't predict because model is currently training")
    }

    langCode = langCode.toLowerCase().trim()
    input = sanitizeText(input)

    // get input embeddings

    const {
      data: { embeddings }
    } = await axios.post(ENDPOINT + '/embeddings', {
      lang: langCode,
      text: input
    })

    const results = _.chain(this.entries)
      .filter(e => !!e.title[langCode])
      .map(entry => {
        const dist = (a, b) => (similarity.cosine(a, b) * (4 - Math.min(distance.euclidean(a, b), 4))) / 4
        const titleEmb = this.cache[getCacheKey(langCode, entry.title[langCode])]
        const content = (entry.content[langCode] || [])
          .map((x, i) => ({
            index: i,
            content: x,
            embedding: this.cache[getCacheKey(langCode, x)],
            confidence: 0
          }))
          .filter(x => !!x.embedding && x.content && x.content.length >= 20)
          .map(c => ({
            ...c,
            confidence: dist(c.embedding, embeddings)
          }))

        const titleDist = titleEmb ? dist(embeddings, titleEmb) : 0

        const confidences = [titleDist]

        const topContent = _.maxBy(content, 'confidence')
        if (topContent?.confidence > 0) {
          // confidences.push(topContent.confidence)
        }

        return {
          ...entry,
          confidence: _.mean(confidences),
          content: entry.content[langCode] && entry.content[langCode].join(' ')
        }
      })
      .filter(x => !isNaN(x.confidence) && x.confidence > 0)
      .orderBy('confidence', 'desc')
      .take(3)
      .value()

    try {
      const {
        data: { answers }
      } = await axios.post(ENDPOINT + '/answers', {
        lang: langCode.toLowerCase().trim(),
        question: sanitizeText(input),
        docs: results.map(result => result.content)
      })

      return _.orderBy(
        results.map((r, i) => ({
          title: r.title[langCode],
          content: r.content,
          confidence: r.confidence,
          entry_id: r.id,
          highlight_start: answers[i].start,
          highlight_end: answers[i].end,
          answer: r.content.substr(answers[i].start, answers[i].end),
          answerSnippet: r.content.substr(
            Math.max(0, r.content.lastIndexOf('.', answers[i].start)),
            r.content.indexOf('.', answers[i].start) > 0 ? r.content.indexOf('.', answers[i].start) : undefined
          )
        })),
        'confidence',
        'desc'
      )
    } catch (err) {
      console.log(err)
    }

    return results.map((r, i) => ({
      title: r.title[langCode],
      content: r.content,
      confidence: r.confidence,
      entry_id: r.id,
      highlight_start: -1,
      highlight_end: -1,
      answer: null,
      answerSnippet: null
    }))
  }

  toJSON(): string {
    if (!this.trained) {
      throw new Error("Can't serialize model because model is not trained")
    }

    if (this.training) {
      throw new Error("Can't serialize model because model is currently training")
    }

    return JSON.stringify({
      trained: this.trained,
      entries: this.entries,
      cache: this.cache,
      langs: this.langs
    })
  }

  static async fromJSON(data: string): Promise<RemoteModel> {
    const { cache, langs, entries, trained } = JSON.parse(data)
    return new RemoteModel(entries, langs, cache, trained)
  }
}
