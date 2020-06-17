import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import { preprocess_qna } from './tools'

export default async (bp: typeof sdk, embedder) => {
  const router = bp.http.createRouterForBot('new_qna')

  const inferQuestion = question => {}
  const rerank = () => {}

  router.post('/inferQuestion', async (req, res) => {
    res.send(await inferQuestion(req.body.question))
  })
  router.get('/rerank', async (req, res) => {
    res.send(await rerank())
  })
}
