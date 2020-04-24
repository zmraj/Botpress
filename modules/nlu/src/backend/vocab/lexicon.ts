import { ScopedGhostService } from 'botpress/sdk'

export type LexiconByLang = { [languageCode: string]: Lexicon }
export type Lexicon = { [topicId: string]: string[] }
export type LexiconVectors = number[][]

export async function getLexicon(ghost: ScopedGhostService, languages: string[]): Promise<LexiconByLang> {
  const emptyLexicon = languages.reduce((acc, lang) => ({ ...acc, [lang]: {} }), {}) as LexiconByLang
  if (await ghost.fileExists('/', 'lexicon.json')) {
    try {
      const lexicon = (await ghost.readFileAsObject('/', 'lexicon.json')) as LexiconByLang
      return { ...emptyLexicon, ...lexicon }
    } catch (err) {
      // not all bots will have a lexicon so we swallow the error
      return emptyLexicon
    }
  }
  return emptyLexicon
}
