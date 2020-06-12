"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _api = _interopRequireDefault(require("./api"));

var _setup = require("./setup");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const bots = {};

const onServerStarted = async bp => {
  await (0, _setup.initModule)(bp, bots);
};

const onServerReady = async bp => {
  await (0, _api.default)(bp, bots);
};

const onBotMount = async (bp, botId) => {
  await (0, _setup.initBot)(bp, botId, bots);
};

const onBotUnmount = async (bp, botId) => {
  delete bots[botId];
};

const onModuleUnmount = async bp => {
  bp.events.removeMiddleware('kb.incoming');
  bp.http.deleteRouterForBot('kb');
};

const entryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  onBotUnmount,
  onModuleUnmount,
  // translations: { en, fr },
  definition: {
    name: 'kb',
    menuIcon: 'question_answer',
    menuText: 'Knowledge Base',
    fullName: 'KB',
    homepage: 'https://botpress.com'
  }
};
var _default = entryPoint;
exports.default = _default;
//# sourceMappingURL=index.js.map