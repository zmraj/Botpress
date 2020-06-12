"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _axios = _interopRequireDefault(require("axios"));

var _crypto = _interopRequireDefault(require("crypto"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _lodash = _interopRequireWildcard(require("lodash"));

var _lruCache = _interopRequireDefault(require("lru-cache"));

var _mathjs = require("mathjs");

var _mlDistance = require("ml-distance");

var _ms = _interopRequireDefault(require("ms"));

var _path = _interopRequireDefault(require("path"));

var _storage = require("./storage");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const debug = DEBUG('kb').sub('lang');

const hash = str => _crypto.default.createHash('md5').update(str).digest('hex');

let _cacheDumpDisabled = false;

const _vectorsCachePath = _path.default.join(process.APP_DATA_PATH, 'cache', 'mod_kb_vectors.json');

const _vectorsCache = new _lruCache.default({
  length: arr => {
    if (arr && arr.BYTES_PER_ELEMENT) {
      return arr.length * arr.BYTES_PER_ELEMENT;
    } else {
      return 768
      /* dim */
      * Float32Array.BYTES_PER_ELEMENT;
    }
  },
  max: 768
  /* dim */
  * Float32Array.BYTES_PER_ELEMENT
  /* bytes */
  * 10000000
  /* 10M sentences */

});

const onVectorsCacheChanged = (0, _lodash.debounce)(async () => {
  if (!_cacheDumpDisabled) {
    await dumpVectorsCache();
  }
}, (0, _ms.default)('5s'));

async function dumpVectorsCache() {
  try {
    await _fsExtra.default.ensureFile(_vectorsCachePath);
    await _fsExtra.default.writeJSON(_vectorsCachePath, _vectorsCache.dump());
    debug('vectors cache updated at: %s', _vectorsCachePath);
  } catch (err) {
    _cacheDumpDisabled = true;
    debug('could not persist vectors cache, error: %s', err.message);
  }
}

async function restoreVectorsCache() {
  try {
    if (await _fsExtra.default.pathExists(_vectorsCachePath)) {
      const dump = await _fsExtra.default.readJSON(_vectorsCachePath);

      if (dump) {
        const kve = dump.map(x => ({
          e: x.e,
          k: x.k,
          v: Float32Array.from(Object.values(x.v))
        }));

        _vectorsCache.load(kve);
      }
    }
  } catch (err) {
    debug('could not restore vectors cache, error: %s', err.message);
  }
}

const restoreCachePromise = restoreVectorsCache();
const ENDPOINT = process.env.BP_MODULE_KB_ENDPOINT || 'https://covid-qc-qna.botpress.cloud';

const getCacheKey = (lang, input) => `${hash((0, _storage.sanitizeText)(input)).toLowerCase().trim()}//${lang.toLowerCase().trim()}`;

class RemoteModel {
  constructor(entries = [], langs = [], trained = false, model) {
    this.entries = entries;
    this.langs = langs;
    this.trained = trained;
    this.model = model;

    _defineProperty(this, "training", false);

    _defineProperty(this, "cancelled", false);
  }

  async getPhraseVector(phrase, lang) {
    try {
      const cacheKey = getCacheKey(lang, phrase);

      if (_vectorsCache.has(cacheKey)) {
        return Array.from(_vectorsCache.get(cacheKey).values());
      }

      const {
        data
      } = await _axios.default.post(ENDPOINT + '/embeddings', {
        lang: lang.toLowerCase().trim(),
        documents: [(0, _storage.sanitizeText)(phrase)]
      }); // console.log(data)
      // console.log(data.data)

      const embeddings = data.data[0];

      if (!embeddings || !embeddings.length || isNaN(embeddings[0])) {
        throw new Error('Received invalid embeddings');
      }

      _vectorsCache.set(getCacheKey(lang, phrase), embeddings);

      onVectorsCacheChanged(); // TODO:

      return embeddings;
    } catch (err) {
      console.log(err);
    }
  }

  async train(data) {
    if (this.training) {
      throw new Error('Already training');
    }

    if (this.trained) {
      throw new Error('Already trained');
    }

    await restoreCachePromise; // TODO:

    this.trained = false;
    this.cancelled = false;
    this.training = true;

    try {
      const langs = _lodash.default.uniq(_lodash.default.flatten(data.map(x => [...Object.keys(x.content), ...Object.keys(x.title)])));

      const {
        progress
      } = function () {
        let i = 0;
        const total = data.length;

        const progress = () => {
          const percent = (i++ / total * 100).toFixed(1);
          debug(`Progress is ${i} / ${total} (${percent} %)`);
        };

        return {
          progress
        };
      }();

      const model = {
        entries: [...data],
        support_vectors: [],
        trained_on: new Date()
      };

      for (const entry of data) {
        if (this.cancelled) {
          break;
        }

        for (const lang of langs) {
          if (this.cancelled) {
            break;
          }

          const questions = _lodash.default.uniq([entry.title[lang], ...entry.feedback[lang].filter(x => x.polarity).map(x => x.utterance)]); // TODO use every content here instead of only the 1st one


          const title = entry.title[lang];
          const title_embedding = await this.getPhraseVector(title, lang);

          for (const content of entry.content[lang]) {
            const originalContentEmb = await this.getPhraseVector(content, lang);

            if (!originalContentEmb) {
              continue;
            }

            let reranked_emb = [...originalContentEmb];

            for (const question of questions) {
              const questionEmb = await this.getPhraseVector(question, lang);

              if (!questionEmb) {
                continue;
              }

              const questionEmbNorm = (0, _mathjs.multiply)((0, _mathjs.norm)(reranked_emb) / (0, _mathjs.norm)(questionEmb), [...questionEmb]);
              const direction = (0, _mathjs.subtract)(questionEmbNorm, reranked_emb);
              reranked_emb = (0, _mathjs.add)(reranked_emb, (0, _mathjs.multiply)(0.1, direction));

              _vectorsCache.set(getCacheKey(lang, content), Float32Array.from(reranked_emb));
            } // note that we do this after the for loop so we can use the latest version of mutedEmb (yes, we edit in place ...)


            model.support_vectors.push({
              content_embedding: reranked_emb,
              title_embedding,
              lang,
              content,
              title
            }); //
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

        progress();
      }

      if (!this.cancelled) {
        this.entries = data;
        this.langs = langs;
        this.trained = true;
        this.model = model;
      }
    } catch (err) {
      this.trained = false;
      debug('Error training KB', err);
    } finally {
      this.training = false;
      this.cancelled = false;
      return this.trained;
    }
  }

  cancelTraining() {
    if (!this.training) {
      throw new Error("Can't cancel training because training has not started");
    }

    this.cancelled = true;
  } // async predict(input: string, langCode: string): Promise<Prediction[]> {
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


  compute_confidence(support_vectors, question_embed) {
    const conf_content = _mlDistance.similarity.cosine(support_vectors.content_embedding, question_embed);

    const conf_title = _mlDistance.similarity.cosine(support_vectors.title_embedding, question_embed);

    const confidence = (conf_title + conf_content) / 2; // TODO : timestamp should affect confidence
    // timestamps = np.array([sub_dic["ts"] for sub_dic in dico.values()])
    // min_ts = np.min(timestamps)
    // max_ts = np.max(timestamps)
    // trunc_ts = np.floor(min_ts / max_ts * 100
    // score_ts = 1 / (1 + exp((timestamp / max_ts * 100) - trunc_ts))
    //     weight_cos = WEIGHT_CONTENT
    //     pertinance = (weight_cos * score_cos + score_ts) / (weight_cos + 1)

    return confidence;
  }

  async predict(input, langCode) {
    if (!this.trained) {
      throw new Error("Can't predict because model is not trained");
    }

    if (this.training) {
      throw new Error("Can't predict because model is currently training");
    }

    langCode = langCode.toLowerCase().trim();
    const question_embed = await this.getPhraseVector(input, langCode);
    const sv = this.model.support_vectors.filter(x => x.lang === langCode).map(sv => ({ ...sv,
      confidence: this.compute_confidence(sv, question_embed)
    }));

    const top = _lodash.default.chain(sv).filter(x => !isNaN(x.confidence) && x.confidence > 0).orderBy('confidence', 'desc').take(3).value(); // const paylaod = {
    //   lang: langCode.toLowerCase().trim(),
    //   question: sanitizeText(input),
    //   // documents: _.flatMap(top, res => [res.content, res.title])
    //   documents: [top[0].content, top[0].title]
    // }
    // const { data } = await axios.post(ENDPOINT + '/answers', paylaod)


    return {
      docs: [{
        content: top[0].content,
        score: top[0].confidence
      }, {
        content: top[1].content,
        score: top[1].confidence
      }, {
        content: top[2].content,
        score: top[2].confidence
      }] // answer: { content: data.answer, score: data.score }

    }; // return _.orderBy(
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

  toJSON() {
    if (!this.trained) {
      throw new Error("Can't serialize model because model is not trained");
    }

    if (this.training) {
      throw new Error("Can't serialize model because model is currently training");
    }

    return JSON.stringify({
      trained: this.trained,
      entries: this.entries,
      model: this.model,
      langs: this.langs
    });
  }

  static async fromJSON(data) {
    const {
      model,
      langs,
      entries,
      trained
    } = JSON.parse(data);
    return new RemoteModel(entries, langs, trained, model);
  }

}

exports.default = RemoteModel;
//# sourceMappingURL=model.js.map