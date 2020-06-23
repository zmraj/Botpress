import { words } from 'lodash'
import { addDocumentToIndex, createIndex } from 'ndx'
import { query } from 'ndx-query'

function termFilter(term) {
  return term.toLowerCase()
}

export function createDocumentIndex(fields) {
  // `createIndex()` creates an index data structure.
  // First argument specifies how many different fields we want to index.
  const index = createIndex(fields.length)
  // `fieldAccessors` is an array with functions that used to retrieve data from different fields.
  const fieldAccessors = fields.map(f => doc => doc[f.name])
  // `fieldBoostFactors` is an array of boost factors for each field, in this example all fields will have
  // identical factors.
  const fieldBoostFactors = fields.map(() => 1)

  return {
    // `add()` function will add documents to the index.
    add: doc => {
      addDocumentToIndex(
        index,
        fieldAccessors,
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
    },
    // `search()` function will be used to perform queries.
    search: q =>
      query(
        index,
        fieldBoostFactors,
        // BM25 ranking function constants:
        1.2, // BM25 k1 constant, controls non-linear term frequency normalization (saturation).
        0.75, // BM25 b constant, controls to what degree document length normalizes tf values.
        words,
        termFilter,
        // Set of removed documents, in this example we don't want to support removing documents from the index,
        // so we can ignore it by specifying this set as `undefined` value.
        undefined,
        q
      )
  }
}
