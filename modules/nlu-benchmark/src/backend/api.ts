import * as sdk from 'botpress/sdk'
import { spawnSync } from 'child_process'
import { getAppDataPath } from 'common/utils'
import fse from 'fs-extra'
import path from 'path'
import rimraf from 'rimraf'

import { DeepEmbedder } from '../models/embedders/deep_onnx_embedder'
import { test_sentence_embeddings } from '../tests/test_sentence_embeddings'
import { test_word_embeddings } from '../tests/test_word_embeddings'

interface ModelsTests {
  model_name: string
  test_embeddings: boolean
  test_intents: boolean
  test_qa: boolean
}

const { spawn } = require('child_process')
export default async (bp: typeof sdk) => {
  const router = bp.http.createRouterForBot('nlu-benchmark')

  const importOnnxModels = async (model_name: string) => {
    const model_cache = path.join(
      getAppDataPath(),
      'cache',
      'deep_models',
      'embedders',
      'onnx',
      model_name.replace('/', '_')
    )
    const tokenizer_path = path.join(
      getAppDataPath(),
      'cache',
      'deep_models',
      'tokenizers',
      model_name.replace('/', '_')
    )
    rimraf.sync(model_cache)
    rimraf.sync(tokenizer_path)
    const out = []
    const dl_and_export = spawnSync('python', [
      path.join(__dirname, '..', '..', 'src', 'backend', 'onnx_importer.py'),
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

    // dl_and_export.stdout.on('data', data => {
    //   console.log(`stdout: ${data}`)
    //   out.push(data)
    // })

    // dl_and_export.stderr.on('data', data => {
    //   console.log(`stderr: ${data}`)
    //   out.push(data)
    // })

    // dl_and_export.on('error', error => {
    //   console.log(`error: ${error.message}`)
    // })

    // dl_and_export.on('close', code => {
    //   console.log(`exporting onnx model exited with code ${code}`)
    // })
    return dl_and_export.output.join('\n')
  }
  const importTfModels = async (model_name: string) => {
    const model_cache = path.join(getAppDataPath(), 'cache', 'deep_models', 'embedders', 'tensorflow', model_name)
    const dl_and_export = spawn('python', [
      path.join(__dirname, '..', '..', 'src', 'backend', 'tf_importer.py'),
      '-m',
      model_name,
      '--cache',
      model_cache
    ])

    dl_and_export.stdout.on('data', data => {
      console.log(`stdout: ${data}`)
    })

    dl_and_export.stderr.on('data', data => {
      console.log(`stderr: ${data}`)
    })

    dl_and_export.on('error', error => {
      console.log(`error: ${error.message}`)
    })

    dl_and_export.on('close', code => {
      console.log(`exporting onnx model exited with code ${code}`)
    })
  }

  const cleanPytorchCache = async () => {}

  const listAvailablesModelsName = async () => {
    const models_path = path.join(getAppDataPath(), 'cache', 'deep_models', 'embedders', 'onnx')
    return fse.readdir(models_path)
  }

  const listAvailablesDatasetName = async () => {
    const datasets_path = path.join(__dirname, '..', '..', 'src', 'datasets')

    const intent_datasets: string[] = await fse.readdir(path.join(datasets_path, 'intents'))
    const qna_datasets: string[] = await fse.readdir(path.join(datasets_path, 'qna'))
    const embeddings_datasets: string[] = await fse.readdir(path.join(datasets_path, 'embeddings'))
    return { intents: intent_datasets, qna: qna_datasets, embeddings: embeddings_datasets }
  }

  const runTests = async datas => {
    console.log(datas)
    const models = new Set([].concat.apply([], Object.values(datas.checked)))
    console.log(models)
    const loaded_models = []

    // Embeddings
    for (const model_name of models) {
      const mod = new DeepEmbedder(model_name as string)
      await mod.load()
      loaded_models.push([model_name, mod])
    }
    const word_results = await test_word_embeddings(loaded_models)
    const sentence_results = await test_sentence_embeddings(loaded_models)
    return { words: word_results, sentence: sentence_results }
    // Launch each test and give live results
  }

  router.get('/modelsName', async (req, res) => {
    res.send((await listAvailablesModelsName()) as string[])
  })

  router.get('/datasetsName', async (req, res) => {
    res.send(await listAvailablesDatasetName())
  })

  router.post('/runTests', async (req, res) => {
    res.send(await runTests(req.body))
  })

  router.post('/importOnnxModels', async (req, res) => {
    res.send(await importOnnxModels(req.body.new_model_input))
  })
  router.post('/importTfModels', async (req, res) => {
    res.send(await importTfModels(req.body.new_model_input))
  })
  const run_embedding_test = async (model: any, dataset: string[]) => {}
  const run_intent_test = async (model: any, dataset: string[]) => {}
  const run_qa_test = async (model: any, dataset: string[]) => {}
}
