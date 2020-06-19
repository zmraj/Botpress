import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import fse from 'fs-extra'
import _ from 'lodash'
import path from 'path'

import en from '../translations/en.json'
import fr from '../translations/fr.json'

import api from './api'
import { DeepEmbedder } from './embedder'
import { rerank } from './reranker'
import { preprocess_qna } from './tools'
import { kb_entry } from './typings'

const embedder_name = 'DeepPavlov_bert-base-multilingual-cased-sentence'
// const embedder_name = 'flaubert_flaubert_large_cased'
// const embedder_name = 'fmikaelian_flaubert-base-uncased-squad'

// const embedder_name = 'distilbert-base-multilingual-cased'
let kb_content: kb_entry[] = []
const embedder = new DeepEmbedder(embedder_name)
// const qa_pipeline = new QaPipeline('')

const onServerStarted = async (bp_sdk: typeof sdk) => {
  bp_sdk.logger.warn(
    'You are using Botpress New QNA module which is meant to be tested and released only by the botpress team'
  )
}

const onServerReady = async (bp_sdk: typeof sdk) => {
  await api(bp_sdk, embedder, kb_content)
}

const onBotMount = async (bp_sdk: typeof sdk) => {
  await embedder.load()
  const qna_rerank_path = path.join(
    __dirname,
    '..',
    '..',
    'datas',
    'embedded',
    embedder.model_name,
    'qna_reranked.json'
  )
  const qna_path = path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name, 'qna.json')
  if (await fse.pathExists(qna_rerank_path)) {
    console.log('Rerank found')
    kb_content = await fse.readJSON(qna_rerank_path)
  } else if (await fse.pathExists(qna_path)) {
    console.log('No rerank')
    kb_content = await fse.readJSON(qna_path)
    await rerank(kb_content, embedder)
  } else {
    console.log('No data')
    await preprocess_qna(embedder, kb_content)
    console.log('PREprocessed datas !')
    await rerank(kb_content, embedder)
    console.log('reranked datas')
  }
}

const onModuleUnmount = async (bp_sdk: typeof sdk) => {
  bp_sdk.http.deleteRouterForBot('new_qna')
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
