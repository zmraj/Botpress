import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import fse from 'fs-extra'
import _ from 'lodash'
import { fromSerializable } from 'ndx-serializable'
import path from 'path'

import en from '../translations/en.json'
import fr from '../translations/fr.json'

import api from './api'
import { Bm25Index } from './bm25'
import { Contextizer } from './contextizers'
import { DeepEmbedder, PythonEmbedder } from './embedder'
import { rerank } from './reranker'
import { extract_question_context, preprocess_qna } from './tools'
import { kb_entry } from './typings'

// const embedder_name = 'DeepPavlov_bert-base-multilingual-cased-sentence'
// const embedder_name = 'flaubert_flaubert_large_cased'
// const embedder_name = 'fmikaelian_flaubert-base-uncased-squad'
// const embedder_name = 'distilbert-base-multilingual-cased'

// const embedder = new DeepEmbedder(embedder_name)
const embedder = new PythonEmbedder()

// const embedder = new PythonEmbedder()
const state: {
  content: kb_entry[]
  reranked_content: kb_entry[]
  embedder: DeepEmbedder | PythonEmbedder
  contextizer: Contextizer
  bm25_index
} = { content: [], reranked_content: [], embedder, contextizer: undefined, bm25_index: undefined }

const onServerStarted = async (bp_sdk: typeof sdk) => {
  bp_sdk.logger.warn(
    'You are using Botpress New QNA module which is meant to be tested and released only by the botpress team'
  )
}

const onServerReady = async (bp_sdk: typeof sdk) => {
  await api(bp_sdk, state)
}

const onBotMount = async (bp_sdk: typeof sdk) => {
  await state.embedder.load()
  const qna_rerank_path = path.join(
    __dirname,
    '..',
    '..',
    'datas',
    'embedded',
    state.embedder.model_name,
    'qna_reranked.json'
  )
  const qna_path = path.join(__dirname, '..', '..', 'datas', 'embedded', state.embedder.model_name, 'qna.json')
  if (!(await fse.pathExists(path.join(__dirname, '..', '..', 'datas', 'questions_context.json')))) {
    console.log('Extracting question / context')
    extract_question_context()
  }
  state.contextizer = new Contextizer(state.embedder, bp_sdk)
  await state.contextizer.load()

  state.bm25_index = undefined
  const index_path = path.join(__dirname, '..', '..', 'datas', 'index', state.embedder.model_name, 'index.json')
  if (await fse.pathExists(index_path)) {
    console.log('Loading Index !')
    const data = await fse.readJSON(index_path)
    state.bm25_index = new Bm25Index([{ name: 'content' }])
    const index = fromSerializable(data)
    state.bm25_index.index = index
  } else {
    console.log('No index')
    state.bm25_index = new Bm25Index([{ name: 'content' }])
  }

  if (await fse.pathExists(qna_rerank_path)) {
    console.log('Rerank found')
    state.reranked_content = await fse.readJSON(qna_rerank_path)
  } else if (await fse.pathExists(qna_path)) {
    console.log('No rerank')
    state.content = await fse.readJSON(qna_path)
    state.reranked_content = await rerank(state.content, state.embedder)
  } else {
    console.log('No data')
    const ret = await preprocess_qna(state.embedder, state.bm25_index)
    state.content = ret[0]
    state.bm25_index = ret[1]
    console.log('PREprocessed datas !')
    state.reranked_content = await rerank(state.content, state.embedder)
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
