import { model } from '@tensorflow/tfjs-node'
import * as sdk from 'botpress/sdk'
import { getAppDataPath } from 'common/utils'
import fse from 'fs-extra'
import path from 'path'

interface Models {
  model_name: string
  test_embeddings: boolean
  test_intents: boolean
  test_qa: boolean
}

const { spawn } = require('child_process')
export default async (bp: typeof sdk) => {
  const router = bp.http.createRouterForBot('nlu-benchmark')

  const export_deep_model = async (model_name: string) => {
    const bp_models_cache = path.join(getAppDataPath(), 'deep_models')
    const dl_and_export = spawn('python', ['./python_exporter.py', '-m', model_name, '--cache', bp_models_cache])

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
      console.log(`child process exited with code ${code}`)
    })
  }

  const getModelsName = async () => {
    const models_path = path.join(getAppDataPath(), 'cache', 'deep_models', 'tensorflow')
    return fse.readdir(models_path)
  }

  const postRunTests = async datas => {
    console.log(datas)
    // Load models returned by the checkbox
    // Launch each test and give live results
  }

  router.get('/modelsName', async (req, res) => {
    res.send((await getModelsName()) as string[])
  })

  router.post('/runTests', async (req, res) => {
    res.send(await postRunTests(req.body))
  })

  const run_embedding_test = async (model: any, dataset: string[]) => {}
  const run_intent_test = async (model: any, dataset: string[]) => {}
  const run_qa_test = async (model: any, dataset: string[]) => {}
}
