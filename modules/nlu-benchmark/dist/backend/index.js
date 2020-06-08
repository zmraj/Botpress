"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fr = _interopRequireDefault(require("../translations/fr.json"));

var _en = _interopRequireDefault(require("../translations/en.json"));

var _api = _interopRequireDefault(require("./api"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const onServerStarted = async bp_sdk => {
  bp_sdk.logger.warn('You are using Botpress NLU Benchmark SDK module which is meant only to test new NLU features by the Botpress team.');
};

const onServerReady = async bp_sdk => {
  await (0, _api.default)(bp_sdk);
};

const onModuleUnmount = async bp_sdk => {
  bp_sdk.http.deleteRouterForBot('nlu-benchmark');
};

const botTemplates = [{
  id: 'bp-benchmark',
  name: 'BotPress Benchmark',
  desc: 'This benchmark regroup many tests to check new ideas'
}];
const entryPoint = {
  onServerStarted,
  onServerReady,
  onModuleUnmount,
  botTemplates,
  translations: {
    en: _en.default,
    fr: _fr.default
  },
  definition: {
    name: 'nlu-benchmark',
    menuIcon: 'assessment',
    menuText: 'NLU Benchmark',
    fullName: 'NLU Benchmark',
    homepage: 'https://botpress.com',
    experimental: true
  }
};
var _default = entryPoint;
exports.default = _default;
//# sourceMappingURL=index.js.map