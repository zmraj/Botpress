import { NLU } from 'botpress/sdk'

import Embedder from './embedders'

export async function preprocessDatas(
  intents: NLU.IntentDefinition[],
  entities: NLU.EntityDefinition[],
  embedder: Embedder
): Promise<Datas> {
  const labelToInt = {}
  const intToLabel = {}
  let embed: number[][] = []
  let labels: number[] = []
  for (let i = 0; i < intents.length; i++) {
    labelToInt[intents[i].name] = i
    intToLabel[i] = intents[i].name
    embed = embed.concat(await Promise.all(intents[i].utterances[embedder.lang].map(async utt => embedder.embed(utt))))
    labels = labels.concat(Array(intents[i].utterances[embedder.lang].length).fill(i))
  }
  return { embed, labels }
}

export interface Datas {
  embed: number[][]
  labels: number[]
}
