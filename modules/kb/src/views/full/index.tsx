import { Button } from '@blueprintjs/core'
import { Container } from 'botpress/ui'
import cx from 'classnames'
import _ from 'lodash'
import React, { Component } from 'react'
import { Panel } from 'react-bootstrap'

interface Props {
  contentLang: string
  bp: any
}

export default class KbPage extends Component<Props> {
  state = {}

  trainFromQnA = async () => {
    const { axios } = this.props.bp
    const items = []
    while (true) {
      const { data } = await axios.get('/mod/qna/questions', { params: { offset: items.length, limit: 100 } })
      items.push(...data.items)
      if (items.length >= data.count) {
        break
      }
    }

    function keepText(text) {
      return String(text)
        .replace(/__|\*|\#|(?:\[([^\]]*)\]\([^)]*\))/gm, '$1')
        .replace(/([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?)/gi, '')
        .replace(/page:\/\/([A-Z0-9]+)/gi, '')
        .replace(/section:\/\/([A-Z0-9]+)/gi, '')
        .replace(/source:\/\/([A-Z0-9]+)/gi, '')
        .replace(/ =/gi, '')
        .trim()
    }

    // Transform from QnA to KB
    //
    const entries = items.map(item => {
      const questions = item.data.questions.fr
      return {
        id: item.id,
        version: 1,
        title: { fr: questions[0] },
        source: { fr: 'todo' },
        content: {
          fr: _.flatten(
            item.data.answers.fr.map(x =>
              x
                .split('\n\n')
                .filter(Boolean)
                .filter(x => !x.trim().startsWith('section://'))
                .filter(x => !x.trim().startsWith('page://'))
                .filter(x => !x.trim().startsWith('source://'))
                .map(keepText)
            )
          )
        },
        feedback: { fr: questions.slice(1).map(q => ({ utterance: q, polarity: true, approved: true })) }
      }
    })

    for (const entry of entries) {
      await axios.post('/mod/kb/entries', entry)
      console.log('Axios', entry)
    }
  }

  render() {
    return (
      <Container sidePanelHidden>
        <div />
        <Panel className={cx('kbContainer')}>
          <Panel.Body>
            <Button onClick={() => this.props.bp.axios.post(`/mod/kb/train`)}>Train</Button>
            <Button onClick={this.trainFromQnA}>Train from QnA</Button>
            <Button onClick={() => this.props.bp.axios.post(`/mod/kb/train/cancel`)}>Cancel</Button>
          </Panel.Body>
        </Panel>
      </Container>
    )
  }
}
