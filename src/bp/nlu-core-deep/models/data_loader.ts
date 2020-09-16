import { NLU } from 'botpress/sdk'

import Embedder from './embedders'
import { spellCheck } from './utils'
export async function preprocessDatas(
  intents: NLU.IntentDefinition[],
  entities: NLU.EntityDefinition[],
  embedder: Embedder
): Promise<{ datas: Datas; intToLabel }> {
  const labelToInt = {}
  const intToLabel = {}
  let embed: number[][] = []
  let labels: number[] = []
  for (let i = 0; i < intents.length; i++) {
    labelToInt[intents[i].name] = i
    intToLabel[i] = intents[i].name
    const spellCheckedUtt = await spellCheck(intents[i].utterances[embedder.lang], embedder.lang)
    embed = embed.concat(await Promise.all(spellCheckedUtt.map(async utt => embedder.embed(utt))))
    labels = labels.concat(Array(spellCheckedUtt.length).fill(i))
  }
  return { datas: { embed, labels }, intToLabel }
}
export interface Datas {
  embed: number[][]
  labels: number[]
}
