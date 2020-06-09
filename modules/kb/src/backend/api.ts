import * as sdk from 'botpress/sdk'
import { Request, Response } from 'express'
import { parse, writeToPath } from 'fast-csv'
import fs from 'fs'
import _ from 'lodash'
import { resolve } from 'path'
import yn from 'yn'

import RemoteModel from './model'
import { Entry, ScopedBots } from './typings'
import { KbEntry } from './validation'

export default async (bp: typeof sdk, bots: ScopedBots) => {
  const jsonUploadStatuses = {}
  const router = bp.http.createRouterForBot('kb')

  // /status --> train % , cancel token, started on, started by
  // /predict (n) --> [ content suggestions (all lang), confidence, title, sorted, highlighted ]

  router.get('/entries', async (req: Request, res: Response) => {
    try {
      const { storage } = bots[req.params.botId]
      const items = await storage.fetch()
      res.send({ ...items })
    } catch (e) {
      bp.logger.attachError(e).error('Error listing entries')
      res.status(500).send(e.message || 'Error')
    }
  })

  router.post('/entries', async (req: Request, res: Response, next: Function) => {
    try {
      const entry = await KbEntry.validate<Entry>(req.body)
      const { storage } = bots[req.params.botId]
      const id = await storage.update(entry)
      res.send(id)
    } catch (e) {
      next(new Error(e.message))
    }
  })

  router.get('/predictCSV', async (req: Request, res: Response) => {
    // Load Model
    const model = await bots[req.params.botId].storage.loadLatestModel()
    bp.logger.forBot(req.params.botId).info(`Model loaded successfully`)
    // Load Csv
    const all_rows = []
    fs.createReadStream(resolve(__dirname, 'historique_1000.csv'))
      .pipe(parse({ headers: true }))
      .on('error', error => console.error(error))
      .on('data', row => all_rows.push(row))
      .on('end', (rowCount: number) => console.log(`Parsed ${rowCount} rows`))
    bp.logger.forBot(req.params.botId).info(`CSV loaded successfully`)
    // Predict all questions
    const all_prediction = [['Questions', 'Reponse']]
    for (const question_reponse of all_rows) {
      const q: string = question_reponse.Question
      const res = await model.predict(q, 'fr')
      const content: string = res[0].content
      all_prediction.push([q, content])
    }
    bp.logger.forBot(req.params.botId).info(`Predictions successfully`)
    const filePath = resolve(__dirname, 'deep_historique_1000.csv')
    writeToPath(filePath, all_prediction)
      .on('error', err => console.error(err))
      .on('finish', () => {
        console.log('Done')
      })
    bp.logger.forBot(req.params.botId).info(`CSV write successfully : ALL DONE`)
    res.send('Done')
  })

  router.post('/train', async (req: Request, res: Response, next: Function) => {
    try {
      if (yn(process.env.BP_NLU_DISABLE_TRAINING)) {
        throw new Error('Training disabled on this node')
      }

      if (bots[req.params.botId]?.trainingModel) {
        throw new Error('Already training')
      }

      const model = new RemoteModel()
      bots[req.params.botId].trainingModel = model
      const entries = await bots[req.params.botId].storage.fetch()

      // Floating promise on purpose, we want to return and keep training behind the scene
      // We assume a single node training here
      // TODO: Make this work in cluster training without BP_NLU_DISABLE_TRAINING
      // tslint:disable-next-line: no-floating-promises
      model
        .train(entries)
        .then(async trained => {
          if (trained) {
            await bots[req.params.botId].storage.storeModel(model)
            bots[req.params.botId].loadedModel = model
            bp.logger.forBot(req.params.botId).info(`Success training KB model`)
          } else {
            bp.logger.forBot(req.params.botId).info(`KB model training cancelled`)
          }
        })
        .catch(err => {
          bp.logger
            .forBot(req.params.botId)
            .attachError(err)
            .error(`Could not train KB model`)
        })
        .finally(() => {
          bots[req.params.botId].trainingModel = undefined
        })

      res.send({ training: true })
    } catch (e) {
      next(new Error(e.message))
    }
  })

  router.post('/train/cancel', async (req: Request, res: Response, next: Function) => {
    try {
      if (yn(process.env.BP_NLU_DISABLE_TRAINING)) {
        throw new Error('Training disabled on this node')
      }

      if (!bots[req.params.botId]?.trainingModel) {
        throw new Error('Bot not training')
      }

      bots[req.params.botId].trainingModel.cancelTraining()

      res.send({ training: false })
    } catch (e) {
      next(new Error(e.message))
    }
  })

  router.delete('/entries/:entryId', async (req: Request, res: Response, next: Function) => {
    try {
      const { storage } = bots[req.params.botId]
      await storage.delete(req.params.entryId)
      res.send({ deleted: req.params.entryId })
    } catch (e) {
      next(new Error(e.message))
    }
  })

  // router.delete('/entries/version/:versionId')

  const sendToastError = (action: string, error: string) => {
    bp.realtime.sendPayload(
      bp.RealTimePayload.forAdmins('toast.qna-save', { text: `QnA ${action} Error: ${error}`, type: 'error' })
    )
  }

  const updateUploadStatus = (uploadStatusId: string, status: string) => {
    if (uploadStatusId) {
      jsonUploadStatuses[uploadStatusId] = status
    }
  }
}
