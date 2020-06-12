"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var csv = _interopRequireWildcard(require("fast-csv"));

var _path = _interopRequireDefault(require("path"));

var _yn = _interopRequireDefault(require("yn"));

var _model = _interopRequireDefault(require("./model"));

var _validation = require("./validation");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var _default = async (bp, bots) => {
  const jsonUploadStatuses = {};
  const router = bp.http.createRouterForBot('kb'); // /status --> train % , cancel token, started on, started by
  // /predict (n) --> [ content suggestions (all lang), confidence, title, sorted, highlighted ]

  router.get('/entries', async (req, res) => {
    try {
      const {
        storage
      } = bots[req.params.botId];
      const items = await storage.fetch();
      res.send({ ...items
      });
    } catch (e) {
      bp.logger.attachError(e).error('Error listing entries');
      res.status(500).send(e.message || 'Error');
    }
  });
  router.post('/entries', async (req, res, next) => {
    try {
      const entry = await _validation.KbEntry.validate(req.body);
      const {
        storage
      } = bots[req.params.botId];
      const id = await storage.update(entry);
      res.send(id);
    } catch (e) {
      next(new Error(e.message));
    }
  });
  router.get('/predictCSV', async (req, res) => {
    // Load Model
    const model = await bots[req.params.botId].storage.loadLatestModel();
    bp.logger.forBot(req.params.botId).info(`Model loaded successfully`); // Load Csv

    const readCSV = () => new Promise(resolve => {
      const returnRows = [];
      csv.parseFile(_path.default.join(__dirname, '..', '..', 'assets', 'datas', 'historique_1000.csv'), {
        headers: ['Type', 'Source', 'Question', 'Reponse']
      }).on('data', data => returnRows.push(data)).on('end', () => {
        resolve(returnRows);
      });
    });

    const all_rows = await readCSV();
    console.log(all_rows);
    bp.logger.forBot(req.params.botId).info(`CSV loaded successfully`); // Predict all questions

    const all_prediction = [];

    for (const question_reponse of all_rows.slice(1)) {
      // console.log(question_reponse.Question)
      const res = await model.predict(question_reponse.Question, 'fr');
      all_prediction.push([question_reponse.Type, question_reponse.Source, question_reponse.Question, question_reponse.Reponse, res.docs[0].content]);
    }

    bp.logger.forBot(req.params.botId).info(`Predictions successfully`);

    const filePath = _path.default.join(__dirname, '..', '..', 'assets', 'datas', 'deep_historique_1000.csv');

    csv.writeToPath(filePath, all_prediction).on('error', err => console.error(err)).on('finish', () => {
      console.log('Done');
    });
    bp.logger.forBot(req.params.botId).info(`CSV write successfully : ALL DONE`);
    res.send('Done');
  });
  router.post('/train', async (req, res, next) => {
    try {
      var _bots$req$params$botI;

      if ((0, _yn.default)(process.env.BP_NLU_DISABLE_TRAINING)) {
        throw new Error('Training disabled on this node');
      }

      if ((_bots$req$params$botI = bots[req.params.botId]) === null || _bots$req$params$botI === void 0 ? void 0 : _bots$req$params$botI.trainingModel) {
        throw new Error('Already training');
      }

      const model = new _model.default();
      bots[req.params.botId].trainingModel = model;
      const entries = await bots[req.params.botId].storage.fetch(); // Floating promise on purpose, we want to return and keep training behind the scene
      // We assume a single node training here
      // TODO: Make this work in cluster training without BP_NLU_DISABLE_TRAINING
      // tslint:disable-next-line: no-floating-promises

      model.train(entries).then(async trained => {
        if (trained) {
          await bots[req.params.botId].storage.storeModel(model);
          bots[req.params.botId].loadedModel = model;
          bp.logger.forBot(req.params.botId).info(`Success training KB model`);
        } else {
          bp.logger.forBot(req.params.botId).info(`KB model training cancelled`);
        }
      }).catch(err => {
        bp.logger.forBot(req.params.botId).attachError(err).error(`Could not train KB model`);
      }).finally(() => {
        bots[req.params.botId].trainingModel = undefined;
      });
      res.send({
        training: true
      });
    } catch (e) {
      next(new Error(e.message));
    }
  });
  router.post('/train/cancel', async (req, res, next) => {
    try {
      var _bots$req$params$botI2;

      if ((0, _yn.default)(process.env.BP_NLU_DISABLE_TRAINING)) {
        throw new Error('Training disabled on this node');
      }

      if (!((_bots$req$params$botI2 = bots[req.params.botId]) === null || _bots$req$params$botI2 === void 0 ? void 0 : _bots$req$params$botI2.trainingModel)) {
        throw new Error('Bot not training');
      }

      bots[req.params.botId].trainingModel.cancelTraining();
      res.send({
        training: false
      });
    } catch (e) {
      next(new Error(e.message));
    }
  });
  router.delete('/entries/:entryId', async (req, res, next) => {
    try {
      const {
        storage
      } = bots[req.params.botId];
      await storage.delete(req.params.entryId);
      res.send({
        deleted: req.params.entryId
      });
    } catch (e) {
      next(new Error(e.message));
    }
  }); // router.delete('/entries/version/:versionId')

  const sendToastError = (action, error) => {
    bp.realtime.sendPayload(bp.RealTimePayload.forAdmins('toast.qna-save', {
      text: `QnA ${action} Error: ${error}`,
      type: 'error'
    }));
  };

  const updateUploadStatus = (uploadStatusId, status) => {
    if (uploadStatusId) {
      jsonUploadStatuses[uploadStatusId] = status;
    }
  };
};

exports.default = _default;
//# sourceMappingURL=api.js.map