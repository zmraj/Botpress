import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import fse from 'fs-extra'
import _ from 'lodash'
import { fromSerializable } from 'ndx-serializable'
import path from 'path'

import { Embedder } from '../../../../src/bp/ml/embedder/embedder'
import en from '../translations/en.json'
import fr from '../translations/fr.json'

import api from './api'
import { Bm25Index } from './bm25'
import { rerank } from './reranker'
import { extract_question_context, preprocess_qna } from './tools'
import { kb_entry } from './typings'

const embedder = new Embedder('en')

// const embedder = new PythonEmbedder()
const state: {
  content: kb_entry[]
  reranked_content: kb_entry[]
  embedder: DeepEmbedder | PythonEmbedder
  contextizer: Contextizer
  bm25_index: Bm25Index
} = { content: [], reranked_content: [], embedder, contextizer: undefined, bm25_index: undefined }

const onServerStarted = async (bp_sdk: typeof sdk) => {
  bp_sdk.logger.warn(
    'You are using Botpress Document Retrieval module which is meant to be tested and released only by the botpress team'
  )
}

const onServerReady = async (bp_sdk: typeof sdk) => {
  await api(bp_sdk, state)
}

const onBotMount = async (bp_sdk: typeof sdk) => {

}

const onModuleUnmount = async (bp_sdk: typeof sdk) => {
  bp_sdk.http.deleteRouterForBot('new_qna')
}

const botTemplates: sdk.BotTemplate[] = [
  {
    id: 'bp-retriBot',
    name: 'Document Retrieval',
    desc: 'This bot is a dummy document retrieval bot to test IR before being integrated to bp'
  }
]

const entryPoint: sdk.ModuleEntryPoint = {
  botTemplates,
  onServerStarted,
  onServerReady,
  onBotMount,
  onModuleUnmount,
  translations: { en, fr },
  definition: {
    name: 'retrieval',
    menuIcon: 'assessment',
    menuText: 'Document retrieval',
    fullName: 'Document retrieval',
    homepage: 'https://botpress.com',
    experimental: true
  }
}

export default entryPoint
