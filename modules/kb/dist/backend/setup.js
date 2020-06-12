"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initModule = exports.initBot = void 0;

var _storage = _interopRequireDefault(require("./storage"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const EVENTS_TO_IGNORE = ['session_reference', 'session_reset', 'bp_dialog_timeout', 'visit', 'say_something', ''];

const initBot = async (bp, botId, bots) => {
  const config = await bp.config.getModuleConfigForBot('kb', botId);
  const defaultLang = (await bp.bots.getBotById(botId)).defaultLanguage; //

  const storage = new _storage.default(bp, botId);
  const model = await storage.loadLatestModel().catch(err => undefined);
  bots[botId] = {
    storage,
    config,
    defaultLang,
    loadedModel: model,
    trainingModel: undefined
  };
};

exports.initBot = initBot;

const initModule = async (bp, bots) => {
  bp.events.registerMiddleware({
    name: 'kb.incoming',
    direction: 'incoming',
    handler: async (event, next) => {
      if (!event.hasFlag(bp.IO.WellKnownFlags.SKIP_QNA_PROCESSING) && !EVENTS_TO_IGNORE.includes(event.type)) {
        await processEvent(event, bots[event.botId]);
        next();
      }
    },
    order: 12,
    // must be after the NLU middleware and before the dialog middleware
    description: 'Listen for questions and searches knowledge base'
  });

  const processEvent = async (event, scopedBot) => {
    if (!event.nlu) {
      return;
    }

    if (scopedBot && scopedBot.loadedModel) {
      const result = await scopedBot.loadedModel.predict(event.preview, 'fr'); // const predictions = await loadedModel.predict(event.preview, 'fr')

      bp.logger.debug(`\n\nQuestion: ${event.preview}\n-----------------------\n\n` + result.map((x, i) => `${i}) ${x.title} [${x.confidence.toFixed(2)}]\n${x.answerSnippet} (${x.answerSnippet.length})`).join('\n\n'));
    } // if (loadedModel) {
    // }
    // TODO:

  };
};

exports.initModule = initModule;
//# sourceMappingURL=setup.js.map