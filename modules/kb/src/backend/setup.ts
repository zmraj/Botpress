import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import Storage from './storage'
import { BotParams, ScopedBots } from './typings'

export const initBot = async (bp: typeof sdk, botId: string, bots: ScopedBots) => {
  const config = await bp.config.getModuleConfigForBot('kb', botId)
  const defaultLang = (await bp.bots.getBotById(botId)).defaultLanguage //

  const storage = new Storage(bp, botId)
  const model = await storage.loadLatestModel().catch(err => undefined)
  bots[botId] = { storage, config, defaultLang, loadedModel: model, trainingModel: undefined }
}

export const initModule = async (bp: typeof sdk, bots: ScopedBots) => {
  bp.events.registerMiddleware({
    name: 'kb.incoming',
    direction: 'incoming',
    handler: async (event: sdk.IO.IncomingEvent, next) => {
      if (!event.hasFlag(bp.IO.WellKnownFlags.SKIP_QNA_PROCESSING)) {
        await processEvent(event, bots[event.botId])
        next()
      }
    },
    order: 12, // must be after the NLU middleware and before the dialog middleware
    description: 'Listen for questions and searches knowledge base'
  })

  const processEvent = async (event: sdk.IO.IncomingEvent, scopedBot: BotParams) => {
    if (!event.nlu) {
      return
    }

    if (scopedBot && scopedBot.loadedModel) {
      const result = await scopedBot.loadedModel.predict(event.preview, 'fr')
      // const predictions = await loadedModel.predict(event.preview, 'fr')
      bp.logger.debug(
        `\n\nQuestion: ${event.preview}\n-----------------------\n\n` +
          result
            .map(
              (x, i) => `${i}) ${x.title} [${x.confidence.toFixed(2)}]\n${x.answerSnippet} (${x.answerSnippet.length})`
            )
            .join('\n\n')
      )
    }

    // if (loadedModel) {
    // }

    // TODO:
  }
}
