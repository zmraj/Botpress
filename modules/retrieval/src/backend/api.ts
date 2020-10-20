import * as sdk from 'botpress/sdk'
import _ from 'lodash'


export default async (bp: typeof sdk, state) => {
  const router = bp.http.createRouterForBot('retrieval')

  router.post('/askQuestion', async (req, res) => {
    res.send(await askQuestion(req.body.question, state))
  })

  router.post('/import', async (req, res) => {
    // add to bm25 index
    // add to embeddings index

  })

  router.get('/upload-status/:status-id', async (req, res) => {
  })

}
