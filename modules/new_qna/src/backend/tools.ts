import * as sdk from 'botpress/sdk'
import crypto from 'crypto'
import fs from 'fs'
import _ from 'lodash'
import { toSerializable } from 'ndx-serializable'
import path from 'path'

import { qnas } from '../../datas/raw/qna.json'

import { DeepEmbedder, PythonEmbedder } from './embedder'
import { rerank } from './reranker'
import { feedback, kb_entry } from './typings'

export const regex_sentence: RegExp = /(?<=\s+|^)[\"\'\'\"\'\"\[\(\{\⟨](.*?[.?!])(\s[.?!])*[\"\'\'\"\'\"\]\)\}\⟩](?=\s+|$)|(?<=\s+|^)\S(.*?[.?!])(\s[.?!])*(?=\s+|$)/g
export const regex_url_covid: RegExp = /\[[A-zÀ-ú\!\?\s\’]+\]\([A-zÀ-ú\!\?\s\’:\/\.-\d]+\)/g
export const regex_url: RegExp = /(((http|ftp|https):\/\/)|(www\.))([\wàâçéèêëîïôûùüÿñæœ.,@?^=%&:\\\/~+#-]*[\w@?^=%&\/~+#-])?/g
export const regex_section_covid: RegExp = /section:\/\/[a-zA-z0-9][^\\"\'\n]+/g
export function hash_str(str: string): string {
  // console.log(str)
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex')
}

export async function preprocess_qna(embedder: DeepEmbedder | PythonEmbedder, bm25_index) {
  // TODO : Change loading covid files by getting Q&A files from bp ghost
  const qna = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'datas', 'raw', 'qna.json'), 'utf-8'))
  const content = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'datas', 'raw', 'content.json'), 'utf-8'))
  const kb_content = []

  let n = 0
  for (const entry of qna.qnas) {
    if (entry.id.includes('_')) {
      continue
    }
    // For each entry of qnas, get the source and go fetch the associated content
    const sources = entry.data.answers.fr[0].match(regex_section_covid) || []
    for (const source of sources) {
      if (content.hasOwnProperty(source)) {
        if (content[source].hasOwnProperty('content_fr')) {
          const feedback: feedback[] = []
          for (const question of entry.data.questions.fr) {
            // const utt_emb = await embedder.embed(question)
            feedback.push({
              utterance: question,
              // utterance_emb: utt_emb,
              polarity: 1,
              reranked: false
            })
          }
          const chunked_content = chunk_content(content[source]['content_fr'])
          const contents_embed = await Promise.map(chunked_content, c => embedder.embed(c))
          for (let i = 0; i < chunked_content.length; i++) {
            if (chunked_content[i].length) {
              n += 1
              bm25_index.add({ id: n.toString(), content: chunked_content[i] })
              kb_content.push({
                key: n.toString(),
                orig: hash_str(content[source]['content_fr']),
                content: chunked_content[i],
                embedding: contents_embed[i],
                contexts: entry.data.contexts,
                feedbacks: feedback
              })
            }
          }
        }
      }
    }
  }
  const data = JSON.stringify(kb_content)
  if (!fs.existsSync(path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name))) {
    fs.mkdirSync(path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name), { recursive: true })
  }
  if (!fs.existsSync(path.join(__dirname, '..', '..', 'datas', 'index', embedder.model_name))) {
    fs.mkdirSync(path.join(__dirname, '..', '..', 'datas', 'index', embedder.model_name), { recursive: true })
  }

  // Encode to JSON, MsgPack or other format.
  const index_data = JSON.stringify(toSerializable(bm25_index.index))
  fs.writeFileSync(path.join(__dirname, '..', '..', 'datas', 'index', embedder.model_name, 'index.json'), index_data)
  fs.writeFileSync(path.join(__dirname, '..', '..', 'datas', 'embedded', embedder.model_name, 'qna.json'), data)
  return [kb_content, bm25_index]
}

function chunk_content(entry: string): string[] {
  let chunk = []
  let word_count = 0
  const chunked_content: string[] = []
  // Remove \n and urls from the content
  const clean_content = entry
    .replace(/\n/g, ' ')
    .replace(regex_url_covid, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // Keep original text if regex doesnt match
  const splitted_content = clean_content.match(regex_sentence) || [clean_content]
  // Make chunks by adding sentences until we have more than 150 words then start a new chunk
  for (const sentence of splitted_content) {
    if (word_count + sentence.split(' ').length < 150) {
      chunk.push(sentence)
      word_count += sentence.split(' ').length
    } else {
      chunked_content.push(chunk.join(' '))
      chunk = []
      word_count = 0
    }
  }
  if (!chunked_content.length && chunk.join(' ').length > 50) {
    chunked_content.push(chunk.join(' '))
  }
  return chunked_content
}

export function extract_question_context() {
  const question_context: [string, string][] = []
  for (const entry of qnas) {
    if (entry.id.includes('_')) {
      continue
    }
    const ctx = entry.data.contexts[0]
    for (const q of entry.data.questions.fr) {
      question_context.push([q, ctx])
    }
  }
  const data = JSON.stringify(question_context)
  fs.writeFileSync(path.join(__dirname, '..', '..', 'datas', 'questions_context.json'), data)
}

export async function extract_question_result_gouv() {}
