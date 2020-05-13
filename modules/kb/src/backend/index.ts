import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import api from './api'
import { ScopedBots } from './typings'
import { initBot, initModule } from './setup'

const bots: ScopedBots = {}

const onServerStarted = async (bp: typeof sdk) => {
  await initModule(bp, bots)
}

const onServerReady = async (bp: typeof sdk) => {
  await api(bp, bots)
}

const onBotMount = async (bp: typeof sdk, botId: string) => {
  await initBot(bp, botId, bots)
}

const onBotUnmount = async (bp: typeof sdk, botId: string) => {
  delete bots[botId]
}

const onModuleUnmount = async (bp: typeof sdk) => {
  bp.events.removeMiddleware('kb.incoming')
  bp.http.deleteRouterForBot('kb')
}

const entryPoint: sdk.ModuleEntryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  onBotUnmount,
  onModuleUnmount,
  // translations: { en, fr },
  definition: {
    name: 'kb',
    menuIcon: 'question_answer',
    menuText: 'Knowledge Base',
    fullName: 'KB',
    homepage: 'https://botpress.com'
  }
}

export default entryPoint
