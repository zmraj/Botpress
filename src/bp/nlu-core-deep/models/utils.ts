import fse from 'fs-extra'
import { Nodehun } from 'nodehun'
import path from 'path'
const affix = fse.readFileSync(path.join(process.APP_DATA_PATH, 'spell', 'en', 'index.aff'))
const dictionary = fse.readFileSync(path.join(process.APP_DATA_PATH, 'spell', 'en', 'index.dic'))
const nodehun = new Nodehun(affix, dictionary)

export const spellCheck = async (utterances: string[], lang: string): Promise<string[]> => {
  const correctedUtterances: string[] = []
  for (let utt of utterances) {
    utt = utt.toLowerCase()
    const spaceSplittedUtt = utt.split(' ')
    for (const word of spaceSplittedUtt) {
      const suggestions = (await nodehun.suggest(word.trim().replace(/[?;]/g, ''))) ?? []
      if (suggestions.length > 0) {
        utt = utt.replace(word, suggestions[0])
      }
    }
    correctedUtterances.push(utt)
  }
  return correctedUtterances
}

// export const spellCheck = (utterances: string[], lang: string): string[] => {
//   try {
//     const dictionary = require(`dictionary-${lang}`)
//     const nspell = require('nspell')
//     const correctedUtterances: string[] = []
//     dictionary((err, dict) => {
//       if (err) {
//         throw err
//       }
//       const spell = nspell(dict)

//       for (const utt of utterances) {
//         const correctedUtt = utt
//         console.log(correctedUtt)
//         for (const word of utt.split(' ')) {
//           correctedUtt.replace(word, spell.suggest(word.trim())[0])
//         }
//         console.log(correctedUtt, '\n')
//         correctedUtterances.push(correctedUtt)
//       }
//     })
//     return correctedUtterances
//   } catch (error) {
//     console.log('Error while spell checking : ', error)
//     throw error
//   }
// }
