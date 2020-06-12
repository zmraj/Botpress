"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KbEntry = void 0;

var _joi = _interopRequireDefault(require("joi"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const KbEntry = _joi.default.object().keys({
  id: _joi.default.string().required().not().empty(),
  version: _joi.default.number().required().positive(),
  title: _joi.default.object().required().pattern(/[A-Z]{1,3}/i, _joi.default.string().required().not().empty()),
  source: _joi.default.object().optional().pattern(/[A-Z]{1,3}/i, _joi.default.string().required().not().empty()),
  content: _joi.default.object().required().pattern(/[A-Z]{1,3}/i, _joi.default.array().items(_joi.default.string().required().not().empty())),
  feedback: _joi.default.object().optional().default({}).pattern(/[A-Z]{1,3}/i, _joi.default.array().items(_joi.default.object().keys({
    utterance: _joi.default.string().required().not().empty(),
    polarity: _joi.default.bool().required(),
    approved: _joi.default.bool().default(false)
  })))
});

exports.KbEntry = KbEntry;
//# sourceMappingURL=validation.js.map