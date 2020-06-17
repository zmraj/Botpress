"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("bluebird-global");

var _en = _interopRequireDefault(require("../translations/en.json"));

var _fr = _interopRequireDefault(require("../translations/fr.json"));

var _api = _interopRequireDefault(require("./api"));

var _daemon = _interopRequireDefault(require("./daemon"));

var _db = _interopRequireDefault(require("./db"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let db;

const onServerStarted = async bp => {
  db = new _db.default(bp);
  await db.initialize();
};

const onServerReady = async bp => {
  await (0, _api.default)(bp, db);
};

const onBotMount = async (bp, botId) => {
  await (0, _daemon.default)(botId, bp, db);
};

const entryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  translations: {
    en: _en.default,
    fr: _fr.default
  },
  definition: {
    name: 'broadcast',
    menuIcon: 'settings_input_antenna',
    menuText: 'Broadcast',
    fullName: 'Broadcast',
    homepage: 'https://botpress.com'
  }
};
var _default = entryPoint;
exports.default = _default;
//# sourceMappingURL=index.js.map