"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.sanitizeText = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _model = _interopRequireDefault(require("./model"));

var _validation = require("./validation");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const chunkContent = content => {
  return _lodash.default.chunk(content.split(' '), 200).map(chunk => chunk.join(' ')); // if (content.length <= 1500) {
  //   return [content]
  // } else {
  //   // split paragraphs
  //   return content.split(/\r|\n/g).filter(Boolean)
  // }
}; // upper case sentences
// append ? to suffix
// remove repeated special chars
// typo fixes
// expand contractions
// quebec vocab


const sanitizeText = text => (text || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

exports.sanitizeText = sanitizeText;

class Storage {
  constructor(bp, botId) {
    _defineProperty(this, "bp", void 0);

    _defineProperty(this, "botId", void 0);

    _defineProperty(this, "_data", null);

    this.bp = bp;
    this.botId = botId;
  }

  async update(entry) {
    entry = await _validation.KbEntry.validate(entry);
    entry.updated_on = new Date();
    entry.title = _lodash.default.mapValues(entry.title, title => sanitizeText(title));
    entry.content = _lodash.default.mapValues(entry.content, arr => {
      return _lodash.default.chain(arr).map(chunkContent).flatten().map(sanitizeText).uniq().value().filter(Boolean);
    });
    let data = await this.fetch();
    data = data.filter(x => x.id !== entry.id);
    data.push(entry);
    await this.bp.ghost.forBot(this.botId).upsertFile('./', 'kb_content.json', JSON.stringify(data, undefined, 2));
    this._data = [...data];
  }

  async fetch() {
    try {
      if (!this._data) {
        this._data = await this.bp.ghost.forBot(this.botId).readFileAsObject('./', 'kb_content.json');
      }

      return [...(this._data || [])];
    } catch (err) {
      this.bp.logger.attachError(err).warn('Could not retrieve KB data');
      return [];
    }
  }

  async delete(ids) {
    let data = await this.fetch();
    data = data.filter(o => !ids.includes(o.id));
    await this.bp.ghost.forBot(this.botId).upsertFile('./', 'kb_content.json', JSON.stringify(data, undefined, 2));
  }

  getDataHash(entries) {
    // hash of data/model = hash(entries[] -> ids + modified_on -> join(' + '))
    return '';
  }

  async storeModel(model) {
    await this.bp.ghost.forBot(this.botId).upsertFile('./models', 'kb_latest.json', model.toJSON());
    this._data = undefined;
  }

  async loadLatestModel() {
    try {
      const modelData = await this.bp.ghost.forBot(this.botId).readFileAsString('./models', 'kb_latest.json');

      if (!modelData || !modelData.length) {
        throw new Error('Model not found');
      }

      return _model.default.fromJSON(modelData);
    } catch (err) {
      this.bp.logger.attachError(err).warn(`Could not load KB model`);
    }
  }

}

exports.default = Storage;
//# sourceMappingURL=storage.js.map