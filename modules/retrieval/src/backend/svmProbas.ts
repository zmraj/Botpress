import axios from 'axios'
import _ from 'lodash'

import questions from '../../datas/raw/gouv_results.json'

export async function getSvmProb(state, axiosConfig) {
  console.log("Gettings PRobs !!")
  // debugger;
  const exemples = []
  axiosConfig.baseURL = 'http://localhost:3000/api/v1/bots/plop/'
  for (const q of questions) {
    const evals = [q.eval1 === 'Incorrect dans les deux versions',
    q.eval2 === 'Incorrect dans les deux versions',
    q.eval3 === 'Incorrect dans les deux versions',
    q.eval4 === 'Incorrect dans les deux versions']
    const nb_eval = evals.reduce((p, c) => p + (c ? 1 : 0), 0)

    if (nb_eval >= 1) {
      const { data: { nlu } } = await axios.post(
        'mod/nlu/predict',
        {
          text: q.Question,
          contexts: q.Categorie ? [q.Categorie] : []
        },
        axiosConfig
      )
      const proba = _.chain(nlu.predictions)
        .toPairs()
        .flatMap(([ctx, ctxPredObj]) => {
          return ctxPredObj.intents.map(intentPred => {
            const oosFactor = ctx === 'oos' ? 1 : 1 - nlu.predictions.oos.confidence
            return {
              label: intentPred.label,
              confidence: intentPred.confidence * oosFactor * ctxPredObj.confidence // copy pasted from ndu conditions.ts (now how we elect intent)
            }
          })
        })
        .maxBy('confidence')
        .value()
      exemples.push({ confidence: _.round(proba.confidence, 2), utterance: q.Question, answer: q.botpress, eval: nb_eval })
    }
  }
  console.log("Done")
  console.log("Min : ", Math.min(...exemples.map(o => o.confidence)))
  console.log("Max : ", Math.max(...exemples.map(o => o.confidence)))
  console.log("mean : ", exemples.map(o => o.confidence).reduce((p, c) => c += p) / exemples.length)
  return {
    exemples: exemples,
    min: Math.min(...exemples.map(o => o.confidence)),
    max: Math.max(...exemples.map(o => o.confidence)),
    mean: exemples.map(o => o.confidence).reduce((p, c) => c += p) / exemples.length
  }
}
