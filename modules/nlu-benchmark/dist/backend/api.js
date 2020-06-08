"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _utils = require("common/utils");

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const {
  spawn
} = require('child_process');

var _default = async bp => {
  const router = bp.http.createRouterForBot('nlu-benchmark');

  const export_deep_model = async model_name => {
    const bp_models_cache = _path.default.join((0, _utils.getAppDataPath)(), 'deep_models');

    const dl_and_export = spawn('python', ['./python_exporter.py', '-m', model_name, '--cache', bp_models_cache]);
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
      console.log(`child process exited with code ${code}`);
    });
  };

  const getModelsName = async () => {
    const models_path = _path.default.join((0, _utils.getAppDataPath)(), 'cache', 'deep_models', 'tensorflow');

    return _fsExtra.default.readdir(models_path);
  };

  const postRunTests = async datas => {
    console.log(datas); // Load models returned by the checkbox
    // Launch each test and give live results
  };

  router.get('/modelsName', async (req, res) => {
    res.send((await getModelsName()));
  });
  router.post('/runTests', async (req, res) => {
    res.send((await postRunTests(req.body)));
  });

  const run_embedding_test = async (model, dataset) => {};

  const run_intent_test = async (model, dataset) => {};

  const run_qa_test = async (model, dataset) => {};
};

exports.default = _default;
//# sourceMappingURL=api.js.map