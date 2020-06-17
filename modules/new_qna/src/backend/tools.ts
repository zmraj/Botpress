import crypto from 'crypto'
import fs from 'fs'
import _ from 'lodash'

import { DeepEmbedder } from './embedder'
import { feedback, kb_entry } from './typings'

export function hash_str(str: string): string {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex')
}

export async function preprocess_qna(embedder: DeepEmbedder) {
  const qna = JSON.parse(fs.readFileSync('../datas/raw/qna.json', 'utf-8'))
  const content = JSON.parse(fs.readFileSync('../datas/raw/content.json', 'utf-8'))

  const kb_content: kb_entry[] = []
  for (const entry of qna.qnas) {
    if (entry.id.includes('_')) {
      continue
    }
    // for (const source of entry.data.answers.fr[0].match(/section:\/\/[a-zA-z0-9][^\\"\'\n]/g)) {
    // For each entry of qnas, get the source and go fetch the associated content
    for (const source of entry.data.answers.fr[0].match(/section:\/\/[a-zA-z0-9]/g)) {
      if (content.hasOwnProperty(source)) {
        if (content[source].hasOwnProperty('title_fr') && content[source].hasOwnProperty('content_fr')) {
          const feedback: feedback[] = []
          for await (const question of entry.questions.fr) {
            // const utterance_embed = await embedder.embed(question)
            feedback.push({
              utterance: question,
              // utterance_embed,
              polarity: 1,
              approved: true
            })
          }
          const chunked_content = chunk_content(content[source]['content_fr'])
          const content_embed = await Promise.map(chunked_content, c => embedder.embed(c))
          const title_embed = await embedder.embed(content[source]['title_fr'])

          kb_content.push({
            title: content[source]['title_fr'],
            title_embed,
            content: chunked_content,
            content_embed,
            contexts: entry['contexts'],
            feedback: feedback
          })
        }
      }
    }
  }
  const data = JSON.stringify(kb_content)
  fs.writeFileSync('../datas/embedded/qna_embed.json', data)
  return kb_content
}

function chunk_content(entry: string): string[] {
  const sentence_regex = /(?<=\s+|^)[\"\'\'\"\'\"\[\(\{\⟨](.*?[.?!])(\s[.?!])*[\"\'\'\"\'\"\]\)\}\⟩](?=\s+|$)|(?<=\s+|^)\S(.*?[.?!])(\s[.?!])*(?=\s+|$)/g
  const urls_regex = /(((http|ftp|https):\/\/)|(www\.))([\wàâçéèêëîïôûùüÿñæœ.,@?^=%&:\\\/~+#-]*[\w@?^=%&\/~+#-])?/g
  let chunk = []
  let word_count = 0
  const chunked_content: string[] = []
  // Remove \n and urls from the content
  const splitted_content = entry
    .replace(urls_regex, ' ')
    .replace('\n', ' ')
    .match(sentence_regex)
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
  if (!chunked_content.length) {
    chunked_content.push(chunk.join(' '))
  }
  return chunked_content
}
