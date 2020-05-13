import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import RemoteModel from './model'
import { Entry, Model } from './typings'
import { KbEntry } from './validation'

const chunkContent = (content: string): string[] => {
  return _.chunk(content.split(' '), 200).map(chunk => chunk.join(' '))
  // if (content.length <= 1500) {
  //   return [content]
  // } else {
  //   // split paragraphs
  //   return content.split(/\r|\n/g).filter(Boolean)
  // }
}

// upper case sentences
// append ? to suffix
// remove repeated special chars
// typo fixes
// expand contractions
// quebec vocab
export const sanitizeText = (text: string) =>
  (text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export default class Storage {
  private bp: typeof sdk
  public botId: string

  private _data: Entry[] | null = null

  constructor(bp: typeof sdk, botId: string) {
    this.bp = bp
    this.botId = botId
  }

  async update(entry: Entry): Promise<void> {
    entry = await KbEntry.validate(entry)
    entry.updated_on = new Date()
    entry.title = _.mapValues(entry.title, title => sanitizeText(title))
    entry.content = _.mapValues(entry.content, arr => {
      return _.chain(arr)
        .map(chunkContent)
        .flatten()
        .map(sanitizeText)
        .uniq()
        .value()
        .filter(Boolean)
    })

    let data = await this.fetch()
    data = data.filter(x => x.id !== entry.id)
    data.push(entry)

    await this.bp.ghost.forBot(this.botId).upsertFile('./', 'kb_content.json', JSON.stringify(data, undefined, 2))
    this._data = [...data]
  }

  async fetch(): Promise<Entry[]> {
    try {
      if (!this._data) {
        this._data = await this.bp.ghost.forBot(this.botId).readFileAsObject('./', 'kb_content.json')
      }
      return [...(this._data || [])]
    } catch (err) {
      this.bp.logger.attachError(err).warn('Could not retrieve KB data')
      return []
    }
  }

  async delete(ids: string[]) {
    let data = await this.fetch()
    data = data.filter(o => !ids.includes(o.id))
    await this.bp.ghost.forBot(this.botId).upsertFile('./', 'kb_content.json', JSON.stringify(data, undefined, 2))
  }

  getDataHash(entries: Entry[]): string {
    // hash of data/model = hash(entries[] -> ids + modified_on -> join(' + '))
    return ''
  }

  async storeModel(model: Model): Promise<void> {
    await this.bp.ghost.forBot(this.botId).upsertFile('./models', 'kb_latest.json', model.toJSON())
    this._data = undefined
  }

  async loadLatestModel(): Promise<Model | undefined> {
    try {
      const modelData = await this.bp.ghost.forBot(this.botId).readFileAsString('./models', 'kb_latest.json')
      if (!modelData || !modelData.length) {
        throw new Error('Model not found')
      }
      return RemoteModel.fromJSON(modelData)
    } catch (err) {
      this.bp.logger.attachError(err).warn(`Could not load KB model`)
    }
  }
}
