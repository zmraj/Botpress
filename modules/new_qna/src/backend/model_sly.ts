import axios, { AxiosInstance } from 'axios'
import retry from 'bluebird-retry'
import crypto from 'crypto'
import fse from 'fs-extra'
import httpsProxyAgent from 'https-proxy-agent'
import _, { debounce, sumBy } from 'lodash'
import lru from 'lru-cache'
import { add, divide, multiply, norm, subtract } from 'mathjs'
import { distance, similarity } from 'ml-distance'
import ms from 'ms'
import path from 'path'

const debug = DEBUG('kb').sub('lang')

const hash = str =>
  crypto
    .createHash('md5')
    .update(str)
    .digest('hex')

let _cacheDumpDisabled = false

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
  if (!_cacheDumpDisabled) {
    await dumpVectorsCache()
  }
}, ms('5s'))

async function dumpVectorsCache() {
  try {
    await fse.ensureFile(_vectorsCachePath)
    await fse.writeJSON(_vectorsCachePath, _vectorsCache.dump())
    debug('vectors cache updated at: %s', _vectorsCachePath)
  } catch (err) {
    _cacheDumpDisabled = true
    debug('could not persist vectors cache, error: %s', err.message)
  }
}

async function restoreVectorsCache() {
  try {
    if (await fse.pathExists(_vectorsCachePath)) {
      const dump = await fse.readJSON(_vectorsCachePath)
      if (dump) {
        const kve = dump.map(x => ({ e: x.e, k: x.k, v: Float32Array.from(Object.values(x.v)) }))
        _vectorsCache.load(kve)
      }
    }
  } catch (err) {
    debug('could not restore vectors cache, error: %s', err.message)
  }
}

const restoreCachePromise = restoreVectorsCache()

const ENDPOINT = process.env.BP_MODULE_KB_ENDPOINT || 'https://covid-qc-qna.botpress.cloud'
const getCacheKey = (lang: string, input: string) =>
  `${hash(input)
    .toLowerCase()
    .trim()}//${lang.toLowerCase().trim()}`

export default class RemoteModel implements Model {
  private training = false
  private cancelled = false

  constructor(
    private entries: Entry[] = [],
    private langs: string[] = [],
    private trained: boolean = false,
    private model?: TrainedModel
  ) {}

  private async getPhraseVector(phrase: string, lang: string): Promise<number[] | undefined> {
    try {
      const cacheKey = getCacheKey(lang, phrase)

      if (_vectorsCache.has(cacheKey)) {
        return Array.from(_vectorsCache.get(cacheKey).values())
      }

      const { data } = await axios.post(ENDPOINT + '/embeddings', {
        lang: lang.toLowerCase().trim(),
        documents: [sanitizeText(phrase)]
      })
      // console.log(data)
      // console.log(data.data)

      const embeddings = data.data[0]
      if (!embeddings || !embeddings.length || isNaN(embeddings[0])) {
        throw new Error('Received invalid embeddings')
      }

      _vectorsCache.set(getCacheKey(lang, phrase), embeddings)
      onVectorsCacheChanged() // TODO:
      return embeddings
    } catch (err) {
      console.log(err)
    }
  }

  async train(data: Entry[]): Promise<boolean> {
    if (this.training) {
      throw new Error('Already training')
    }

    if (this.trained) {
      throw new Error('Already trained')
    }

    await restoreCachePromise // TODO:

    this.trained = false
    this.cancelled = false
    this.training = true

    try {
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

      const model: TrainedModel = { entries: [...data], support_vectors: [], trained_on: new Date() }

      for (const entry of data) {
        if (this.cancelled) {
          break
        }
        for (const lang of langs) {
          if (this.cancelled) {
            break
          }

          const questions = _.uniq([
            entry.title[lang],
            ...entry.feedback[lang].filter(x => x.polarity).map(x => x.utterance)
          ])

          // TODO use every content here instead of only the 1st one
          const title = entry.title[lang]
          const title_embedding = await this.getPhraseVector(title, lang)

          for (const content of entry.content[lang]) {
            const originalContentEmb = await this.getPhraseVector(content, lang)
            if (!originalContentEmb) {
              continue
            }
            let reranked_emb = [...originalContentEmb]
            for (const question of questions) {
              const questionEmb = await this.getPhraseVector(question, lang)
              if (!questionEmb) {
                continue
              }
              const questionEmbNorm = multiply(norm(reranked_emb) / norm(questionEmb), [...questionEmb])
              const direction = subtract(questionEmbNorm, reranked_emb)
              reranked_emb = add(reranked_emb, multiply(0.1, direction))
              _vectorsCache.set(getCacheKey(lang, content), Float32Array.from(reranked_emb))
            }

            // note that we do this after the for loop so we can use the latest version of mutedEmb (yes, we edit in place ...)
            model.support_vectors.push({
              content_embedding: reranked_emb,
              title_embedding,
              lang,
              content,
              title
            })
            //
            //
            //
            // model.support_vectors.push({
            //   vector: questionEmb,
            //   lang: lang,
            //   content: entry.content[lang][0],
            //   entry_id: entry.id
            // })
          }
        }

        progress()
      }

      if (!this.cancelled) {
        this.entries = data
        this.langs = langs
        this.trained = true
        this.model = model
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

  // async predict(input: string, langCode: string): Promise<Prediction[]> {
  //   if (!this.trained) {
  //     throw new Error("Can't predict because model is not trained")
  //   }

  //   if (this.training) {
  //     throw new Error("Can't predict because model is currently training")
  //   }

  //   langCode = langCode.toLowerCase().trim()
  //   input = sanitizeText(input)

  //   // get input embeddings

  //   const {
  //     data: { embeddings }
  //   } = await axios.post(ENDPOINT + '/embeddings', {
  //     lang: langCode,
  //     text: input
  //   })

  //   const results = _.chain(this.entries)
  //     .filter(e => !!e.title[langCode])
  //     .map(entry => {
  //       const dist = (a, b) => (similarity.cosine(a, b) * (4 - Math.min(distance.euclidean(a, b), 4))) / 4
  //       const titleEmb = this.cache[getCacheKey(langCode, entry.title[langCode])]
  //       const content = (entry.content[langCode] || [])
  //         .map((x, i) => ({
  //           index: i,
  //           content: x,
  //           embedding: this.cache[getCacheKey(langCode, x)],
  //           confidence: 0
  //         }))
  //         .filter(x => !!x.embedding && x.content && x.content.length >= 20)
  //         .map(c => ({
  //           ...c,
  //           confidence: dist(c.embedding, embeddings)
  //         }))

  //       const titleDist = titleEmb ? dist(embeddings, titleEmb) : 0

  //       const confidences = [titleDist]

  //       const topContent = _.maxBy(content, 'confidence')
  //       if (topContent?.confidence > 0) {
  //         // confidences.push(topContent.confidence)
  //       }

  //       return {
  //         ...entry,
  //         confidence: _.mean(confidences),
  //         content: entry.content[langCode] && entry.content[langCode].join(' ')
  //       }
  //     })
  //     .filter(x => !isNaN(x.confidence) && x.confidence > 0)
  //     .orderBy('confidence', 'desc')
  //     .take(3)
  //     .value()

  //   try {
  //     const {
  //       data: { answers }
  //     } = await axios.post(ENDPOINT + '/answers', {
  //       lang: langCode.toLowerCase().trim(),
  //       question: sanitizeText(input),
  //       docs: results.map(result => result.content)
  //     })

  //     return _.orderBy(
  //       results.map((r, i) => ({
  //         title: r.title[langCode],
  //         content: r.content,
  //         confidence: r.confidence,
  //         entry_id: r.id,
  //         highlight_start: answers[i].start,
  //         highlight_end: answers[i].end,
  //         answer: r.content.substr(answers[i].start, answers[i].end),
  //         answerSnippet: r.content.substr(
  //           Math.max(0, r.content.lastIndexOf('.', answers[i].start)),
  //           r.content.indexOf('.', answers[i].start) > 0 ? r.content.indexOf('.', answers[i].start) : undefined
  //         )
  //       })),
  //       'confidence',
  //       'desc'
  //     )
  //   } catch (err) {
  //     console.log(err)
  //   }

  //   return results.map((r, i) => ({
  //     title: r.title[langCode],
  //     content: r.content,
  //     confidence: r.confidence,
  //     entry_id: r.id,
  //     highlight_start: -1,
  //     highlight_end: -1,
  //     answer: null,
  //     answerSnippet: null
  //   }))
  // }

  compute_confidence(support_vectors: SupportVector, question_embed) {
    const conf_content = similarity.cosine(support_vectors.content_embedding, question_embed)
    const conf_title = similarity.cosine(support_vectors.title_embedding, question_embed)
    const confidence = (conf_title + conf_content) / 2

    // TODO : timestamp should affect confidence

    // timestamps = np.array([sub_dic["ts"] for sub_dic in dico.values()])
    // min_ts = np.min(timestamps)
    // max_ts = np.max(timestamps)
    // trunc_ts = np.floor(min_ts / max_ts * 100
    // score_ts = 1 / (1 + exp((timestamp / max_ts * 100) - trunc_ts))
    //     weight_cos = WEIGHT_CONTENT
    //     pertinance = (weight_cos * score_cos + score_ts) / (weight_cos + 1)
    return confidence
  }

  async predict(input: string, langCode: string): Promise<any> {
    if (!this.trained) {
      throw new Error("Can't predict because model is not trained")
    }

    if (this.training) {
      throw new Error("Can't predict because model is currently training")
    }

    langCode = langCode.toLowerCase().trim()

    const question_embed = await this.getPhraseVector(input, langCode)

    const sv = this.model.support_vectors
      .filter(x => x.lang === langCode)
      .map(sv => ({
        ...sv,
        confidence: this.compute_confidence(sv, question_embed)
      }))

    const top: any[] = _.chain(sv)
      .filter(x => !isNaN(x.confidence) && x.confidence > 0)
      .orderBy('confidence', 'desc')
      .take(3)
      .value()

    // const paylaod = {
    //   lang: langCode.toLowerCase().trim(),
    //   question: sanitizeText(input),
    //   // documents: _.flatMap(top, res => [res.content, res.title])
    //   documents: [top[0].content, top[0].title]
    // }
    // const { data } = await axios.post(ENDPOINT + '/answers', paylaod)

    return {
      docs: [
        { content: top[0].content, score: top[0].confidence },
        { content: top[1].content, score: top[1].confidence },
        { content: top[2].content, score: top[2].confidence }
      ]
      // answer: { content: data.answer, score: data.score }
    }
    // return _.orderBy(
    //   results.map((r, i) => ({
    //     title: r.title[langCode],
    //     content: r.content,
    //     confidence: r.confidence,
    //     entry_id: r.id,
    //     highlight_start: answers[i].start,
    //     highlight_end: answers[i].end,
    //     answer: r.content.substr(answers[i].start, answers[i].end),
    //     answerSnippet: r.content.substr(
    //       Math.max(0, r.content.lastIndexOf('.', answers[i].start)),
    //       r.content.indexOf('.', answers[i].start) > 0 ? r.content.indexOf('.', answers[i].start) : undefined
    //     )
    //   })),
    //   'confidence',
    //   'desc'
    // )
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
      model: this.model,
      langs: this.langs
    })
  }

  static async fromJSON(data: string): Promise<RemoteModel> {
    const { model, langs, entries, trained } = JSON.parse(data)
    return new RemoteModel(entries, langs, trained, model)
  }
}
