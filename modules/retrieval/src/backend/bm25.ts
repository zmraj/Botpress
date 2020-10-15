import { words } from 'lodash'
import { addDocumentToIndex, createIndex } from 'ndx'
import { query } from 'ndx-query'

function termFilter(term) {
  return term.toLowerCase()
  // TODO add stemming or tokenization
}

export class Bm25Index {
  index
  fieldAccessors
  fieldBoostFactors

  constructor(fields) {
    this.index = createIndex(fields.length)
    this.fieldAccessors = fields.map(f => doc => doc[f.name])
    this.fieldBoostFactors = fields.map(() => 1)
  }

  add(doc) {
    addDocumentToIndex(
      this.index,
      this.fieldAccessors,
      // Tokenizer is a function that breaks text into words, phrases, symbols, or other meaningful elements
      // called tokens.
      // Lodash function `words()` splits string into an array of its words, see https://lodash.com/docs/#words for
      // details.
      words,
      // Filter is a function that processes tokens and returns terms, terms are used in Inverted Index to
      // index documents.
      termFilter,
      // Document key, it can be a unique document id or a refernce to a document if you want to store all documents
      // in memory.
      doc.id,
      // Document.
      doc
    )
  }

  // `search()` function will be used to perform queries.
  search(q) {
    return query(
      this.index,
      this.fieldBoostFactors,
      // BM25 ranking function constants:
      1.2, // BM25 k1 constant, controls non-linear term frequency normalization (saturation).
      0.75, // BM25 b constant, controls to what degree document length normalizes tf values.
      words,
      termFilter,
      // Set of removed documents, here we don't want to support removing documents from the index,
      // so we can ignore it by specifying this set as `undefined` value.
      undefined,
      q
    )
  }
}
