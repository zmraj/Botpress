import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import { rerank } from './reranker'
import { inferQuestion } from './retriever'
import { getSvmProb } from './svmProbas'

export default async (bp: typeof sdk, state) => {
  const router = bp.http.createRouterForBot('retrieval')

  router.post('/inferQuestion', async (req, res) => {
    const axiosConfig = await bp.http.getAxiosConfigForBot(req.params.botId, { localUrl: true })
    res.send(await inferQuestion(req.body.question, state, axiosConfig))
  })

  router.get('/getSvmProb', async (req, res) => {
    const axiosConfig = await bp.http.getAxiosConfigForBot(req.params.botId, { localUrl: true })
    res.send(await getSvmProb(state, axiosConfig))
  })

}
