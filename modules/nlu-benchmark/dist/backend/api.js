"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _child_process = require("child_process");

var _utils = require("common/utils");

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

var _rimraf = _interopRequireDefault(require("rimraf"));

var _deep_onnx_embedder = require("../models/embedders/deep_onnx_embedder");

var _test_sentence_embeddings = require("../tests/test_sentence_embeddings");

var _test_word_embeddings = require("../tests/test_word_embeddings");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const {
  spawn
} = require('child_process');

var _default = async bp => {
  const router = bp.http.createRouterForBot('nlu-benchmark');

  const importOnnxModels = async model_name => {
    const model_cache = _path.default.join((0, _utils.getAppDataPath)(), 'cache', 'deep_models', 'embedders', 'onnx', model_name.replace('/', '_'));

    const tokenizer_path = _path.default.join((0, _utils.getAppDataPath)(), 'cache', 'deep_models', 'tokenizers', model_name.replace('/', '_'));

    _rimraf.default.sync(model_cache);

    _rimraf.default.sync(tokenizer_path);

    const out = [];
    const dl_and_export = (0, _child_process.spawnSync)('python', [_path.default.join(__dirname, '..', '..', 'src', 'backend', 'onnx_importer.py'), '--model', model_name, '--tokenizer_path', tokenizer_path, '--framework', 'pt', // Can be tf for tensorflow
    // '--opset', 11,  // The version of onnx operations sets
    '--check-loading', // Check if exported model can be reloaded in pytorch
    '--use-external-format', //
    _path.default.join(model_cache, `${model_name.replace('/', '_')}.onnx`)]); // dl_and_export.stdout.on('data', data => {
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

    return dl_and_export.output.join('\n');
  };

  const importTfModels = async model_name => {
    const model_cache = _path.default.join((0, _utils.getAppDataPath)(), 'cache', 'deep_models', 'embedders', 'tensorflow', model_name);

    const dl_and_export = spawn('python', [_path.default.join(__dirname, '..', '..', 'src', 'backend', 'tf_importer.py'), '-m', model_name, '--cache', model_cache]);
    dl_and_export.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });
    dl_and_export.stderr.on('data', data => {
      console.log(`stderr: ${data}`);
    });
    dl_and_export.on('error', error => {
      console.log(`error: ${error.message}`);
    });
    dl_and_export.on('close', code => {
      console.log(`exporting onnx model exited with code ${code}`);
    });
  };

  const cleanPytorchCache = async () => {};

  const listAvailablesModelsName = async () => {
    const models_path = _path.default.join((0, _utils.getAppDataPath)(), 'cache', 'deep_models', 'embedders', 'onnx');

    return _fsExtra.default.readdir(models_path);
  };

  const listAvailablesDatasetName = async () => {
    const datasets_path = _path.default.join(__dirname, '..', '..', 'src', 'datasets');

    const intent_datasets = await _fsExtra.default.readdir(_path.default.join(datasets_path, 'intents'));
    const qna_datasets = await _fsExtra.default.readdir(_path.default.join(datasets_path, 'qna'));
    const embeddings_datasets = await _fsExtra.default.readdir(_path.default.join(datasets_path, 'embeddings'));
    return {
      intents: intent_datasets,
      qna: qna_datasets,
      embeddings: embeddings_datasets
    };
  };

  const runTests = async datas => {
    console.log(datas);
    const models = new Set([].concat.apply([], Object.values(datas.checked)));
    console.log(models);
    const loaded_models = []; // Embeddings

    for (const model_name of models) {
      const mod = new _deep_onnx_embedder.DeepEmbedder(model_name);
      await mod.load();
      loaded_models.push([model_name, mod]);
    }

    const word_results = await (0, _test_word_embeddings.test_word_embeddings)(loaded_models);
    const sentence_results = await (0, _test_sentence_embeddings.test_sentence_embeddings)(loaded_models);
    return {
      words: word_results,
      sentence: sentence_results
    }; // Launch each test and give live results
  };

  router.get('/modelsName', async (req, res) => {
    res.send((await listAvailablesModelsName()));
  });
  router.get('/datasetsName', async (req, res) => {
    res.send((await listAvailablesDatasetName()));
  });
  router.post('/runTests', async (req, res) => {
    res.send((await runTests(req.body)));
  });
  router.post('/importOnnxModels', async (req, res) => {
    res.send((await importOnnxModels(req.body.new_model_input)));
  });
  router.post('/importTfModels', async (req, res) => {
    res.send((await importTfModels(req.body.new_model_input)));
  });

  const run_embedding_test = async (model, dataset) => {};

  const run_intent_test = async (model, dataset) => {};

  const run_qa_test = async (model, dataset) => {};
};

exports.default = _default;
//# sourceMappingURL=api.js.map