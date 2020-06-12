import * as sdk from 'botpress/sdk'
import { getAppDataPath } from 'common/utils'
import fse from 'fs-extra'
import path from 'path'

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
    const model_cache = path.join(getAppDataPath(), 'deep_models', 'embedders', 'onnx', model_name)
    const dl_and_export = spawn('python', [
      './onnx_exporter.py',
      '--model',
      model_name,
      '--framework',
      'pt', // Can be tf for tensorflow
      // '--opset', 11,  // The version of onnx operations sets
      '--check-loading', // Check if exported model can be reloaded in pytorch
      '--use-external-format', //
      path.join(model_cache, `${model_name}.onnx`)
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
  const importTfModels = async (model_name: string) => {
    const model_cache = path.join(getAppDataPath(), 'deep_models', 'tensorflow', model_name)
    const dl_and_export = spawn('python', ['./tf_exporter.py', '-m', model_name, '--cache', model_cache])

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
    const models_path = path.join(getAppDataPath(), 'cache', 'deep_models', 'embedders', 'tensorflow')
    return fse.readdir(models_path)
  }

  const postRunTests = async datas => {
    console.log(datas)
    // Load models returned by the checkbox
    // Launch each test and give live results
  }

  router.get('/modelsName', async (req, res) => {
    res.send((await listAvailablesModelsName()) as string[])
  })

  router.post('/runTests', async (req, res) => {
    res.send(await postRunTests(req.body))
  })

  router.post('/importOnnxModels', async (req, res) => {
    res.send(await importOnnxModels(req.body))
  })
  router.post('/importTfModels', async (req, res) => {
    res.send(await importTfModels(req.body))
  })
  const run_embedding_test = async (model: any, dataset: string[]) => {}
  const run_intent_test = async (model: any, dataset: string[]) => {}
  const run_qa_test = async (model: any, dataset: string[]) => {}
}
