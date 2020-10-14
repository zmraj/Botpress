import { deprecate } from 'util'

import { DeepEmbedder } from './embedder'

const test = async () => {
  const embedder = new DeepEmbedder('distilbert-base-multilingual-cased')
  await embedder.embed('coucou je suis un lapin')
}

test()
  .then(e => console.log('ok'))
  .catch(e => console.log(e))
