import * as sdk from 'botpress/sdk'
import { spawnSync } from 'child_process'
import _ from 'lodash'
import path from 'path'
import rimraf from 'rimraf'

import { rerank } from './reranker'
import { electClosestQuestions, inferQuestion } from './retriever'
import { runTests } from './tests'

export default async (bp: typeof sdk, embedder, content) => {
  const router = bp.http.createRouterForBot('new_qna')
  const importOnnxModels = async (model_name: string) => {
    console.log('Loading model', model_name)
    const model_cache = path.join(__dirname, '..', '..', 'onnx_models', 'embedders', model_name.replace('/', '_'))
    const tokenizer_path = path.join(__dirname, '..', '..', 'onnx_models', 'tokenizers', model_name.replace('/', '_'))
    rimraf.sync(model_cache)
    rimraf.sync(tokenizer_path)
    const dl_and_export = spawnSync('python', [
      path.join(__dirname, '..', '..', 'onnx_models', 'onnx_importer.py'),
      '--model',
      model_name,
      '--tokenizer_path',
      tokenizer_path,
      '--framework',
      'pt', // Can be tf for tensorflow
      // '--opset', 11,  // The version of onnx operations sets
      '--check-loading', // Check if exported model can be reloaded in pytorch
      '--use-external-format', //
      path.join(model_cache, `${model_name.replace('/', '_')}.onnx`)
    ])
    return dl_and_export.output.join('\n')
  }

  router.post('/inferQuestion', async (req, res) => {
    res.send(await inferQuestion(req.body.question, content, embedder))
  })

  router.post('/importOnnxModels', async (req, res) => {
    res.send(await importOnnxModels(req.body.new_model_name))
  })

  router.get('/runTests', async (req, res) => {
    res.send(await runTests(content, embedder))
  })

  router.post('/electClosestQuestions', async (req, res) => {
    res.send(await electClosestQuestions(req.body.question, content, embedder))
  })
}
