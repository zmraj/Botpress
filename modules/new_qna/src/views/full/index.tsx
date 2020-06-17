import { Button, Checkbox, Icon, Intent, Tooltip } from '@blueprintjs/core'
import { Container } from 'botpress/ui'
import React, { useEffect, useState } from 'react'

import { Answer } from '../../backend/typings'

import style from './style.scss'

const NewQnA = props => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState({ context: '', answer: '' } as Answer)
  const [preprocessState, setPreprocessState] = useState('')

  const rerank = async () => {
    const { data } = await props.bp.axios.post('/mod/nlu-benchmark/inferQuestion', { question })
    setAnswer(data)
  }

  useEffect(() => {}, [])

  return (
    <Container sidePanelHidden>
      <div />
      <div className={style.main}>
        <h1>Covid Bot</h1>
        <p>{preprocessState}</p>
        <input
          type="text"
          value={question}
          onChange={event => {
            setQuestion(event.target.value)
          }}
        />
        <h2>Answer</h2>
        <h3>{answer.answer}</h3>
        <h6>{answer.context}</h6>
      </div>
    </Container>
  )
}
export default NewQnA
