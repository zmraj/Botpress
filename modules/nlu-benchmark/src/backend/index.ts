import * as sdk from 'botpress/sdk'

import fr from '../translations/fr.json'
import en from '../translations/en.json'
import api from './api'

const onServerStarted = async (bp_sdk: typeof sdk) => {
  bp_sdk.logger.warn(
    'You are using Botpress NLU Benchmark SDK module which is meant only to test new NLU features by the Botpress team.'
  )
}
const onServerReady = async (bp_sdk: typeof sdk) => {
  await api(bp_sdk)
}

const onModuleUnmount = async (bp_sdk: typeof sdk) => {
  bp_sdk.http.deleteRouterForBot('nlu-benchmark')
}

const botTemplates: sdk.BotTemplate[] = [
  {
    id: 'bp-benchmark',
    name: 'BotPress Benchmark',
    desc: 'This benchmark regroup many tests to check new ideas'
  }
]

const entryPoint: sdk.ModuleEntryPoint = {
  onServerStarted,
  onServerReady,
  onModuleUnmount,
  botTemplates,
  translations: { en, fr },
  definition: {
    name: 'nlu-benchmark',
    menuIcon: 'assessment',
    menuText: 'NLU Benchmark',
    fullName: 'NLU Benchmark',
    homepage: 'https://botpress.com',
    experimental: true
  }
}

export default entryPoint
