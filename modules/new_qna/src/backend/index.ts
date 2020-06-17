import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import en from '../translations/en.json'
import fr from '../translations/fr.json'

import api from './api'
import { DeepEmbedder } from './embedder'
import { preprocess_qna } from './tools'
import { kb_entry } from './typings'

const content: kb_entry[] = []
const embedder = new DeepEmbedder('DeepPavlov_bert-base-multilingual-cased-sentence')

const onServerStarted = async (bp_sdk: typeof sdk) => {
  bp_sdk.logger.warn(
    'You are using Botpress New QNA module which is meant to be tested and released only by the botpress team'
  )
}

const onServerReady = async (bp_sdk: typeof sdk) => {
  await api(bp_sdk, embedder)
}

const onBotMount = async (bp_sdk: typeof sdk) => {
  await preprocess_qna(embedder)
}

const onModuleUnmount = async (bp_sdk: typeof sdk) => {
  bp_sdk.http.deleteRouterForBot('nlu-benchmark')
}

const botTemplates: sdk.BotTemplate[] = [
  {
    id: 'bp-new-qna',
    name: 'New QnA',
    desc: 'This module is a e2e of the new qna before being integrated to bp'
  }
]
const entryPoint: sdk.ModuleEntryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  onModuleUnmount,
  translations: { en, fr },
  definition: {
    name: 'new_qna',
    menuIcon: 'assessment',
    menuText: 'New QnA',
    fullName: 'New QnA',
    homepage: 'https://botpress.com',
    experimental: true
  }
}
export default entryPoint
