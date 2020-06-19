import { Button, Checkbox, Icon, Intent, Tooltip } from '@blueprintjs/core'
import { Container } from 'botpress/ui'
import React, { useEffect, useState } from 'react'

import { feedback, kb_entry } from '../../backend/typings'

import style from './style.scss'

const NewQnA = props => {
  const [question, setQuestion] = useState('')
  const [new_model_name, setNewModelName] = useState('')
  const [pythonImportLogs, setPythonImportLogs] = useState('')
  const [closestQuestions, setClosestQuestions] = useState([])
  const [results, setResults] = useState([
    {
      question: '',
      bp_bot: '',
      deep_bot: '',
      bp_right: false,
      deep_right: false
    }
  ])
  const [answer, setAnswer] = useState([
    {
      orig: '',
      content: '',
      embedding: [],
      contexts: [],
      confidence: 0,
      feedbacks: [{ utterance: '', polarity: 0, reranked: false } as feedback]
    }
  ])

  const inferQuestion = async () => {
    const { data } = await props.bp.axios.post('/mod/new_qna/inferQuestion', { question })
    console.log(data)
    setAnswer(data)
  }
  const runTests = async () => {
    const { data } = await props.bp.axios.get('/mod/new_qna/runTests')
    setResults(data)
  }
  const importNewOnnxModel = async () => {
    const { data } = await props.bp.axios.post('/mod/new_qna/importOnnxModels', { new_model_name })
    console.log(data)
    setPythonImportLogs(data)
  }

  const electClosestQuestions = async () => {
    const { data } = await props.bp.axios.post('/mod/new_qna/electClosestQuestions', { question })
    setClosestQuestions(data)
  }
  useEffect(() => {}, [])

  return (
    <Container sidePanelHidden>
      <div />
      <div className={style.main}>
        <input
          type="text"
          value={new_model_name}
          onChange={event => {
            setNewModelName(event.target.value)
          }}
        />
        <button onClick={importNewOnnxModel}>Import new Onnx model</button>
        <div>{pythonImportLogs}</div>
        <h1>Covid Bot</h1>
        <input
          type="text"
          value={question}
          onChange={event => {
            setQuestion(event.target.value)
          }}
        />
        <button onClick={inferQuestion}>Ask Question</button>
        <button onClick={runTests}>Run Tests</button>
        <button onClick={electClosestQuestions}>Elect Closests questions</button>
        <h2>Top 3 Answers</h2>
        <div>
          <ul>
            {closestQuestions.map(q => {
              return (
                <li>
                  {q.utterance} _ {q.confidence}
                </li>
              )
            })}
          </ul>
        </div>
        <div>
          {answer.map((e, i) => {
            return (
              <div>
                <h4>Document {i} </h4>
                <h5>Origine</h5>
                <p>{e.orig} </p>
                <h5>Content &nbsp;&nbsp;{e.confidence}</h5>
                <p>{e.content} </p>
                <h5>Contexts</h5>
                <p>{e.contexts} </p>

                {e.feedbacks.map((e, i) => {
                  return (
                    <div>
                      <h5 className={style.inline}>Feedback {i}</h5>
                      <p>
                        {e.reranked}&nbsp;&nbsp;
                        {e.polarity}&nbsp;&nbsp;
                        {e.utterance}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div>
          <h1>Custom tests </h1>
          <table>
            <tbody>
              <tr>
                <td>Question </td>
                <td>Bp</td>
                <td>Deep</td>
                <td>RBp</td>
                <td>RDeep</td>
              </tr>
              {results.map((r, i) => {
                return (
                  <tr>
                    <td>{r.question}</td>
                    <td>{r.bp_bot}</td>
                    <td>{r.deep_bot}</td>
                    <td>
                      <Checkbox
                        checked={results[i].bp_right}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          results[i].bp_right = e.target.checked
                          setResults([...results])
                        }}
                      ></Checkbox>
                    </td>
                    <td>
                      <Checkbox
                        checked={results[i].deep_right}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          results[i].deep_right = e.target.checked
                          setResults([...results])
                        }}
                      ></Checkbox>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p>
            BP right {results.filter(e => e.bp_right).length} / {results.length}
          </p>
          <p>
            Deep right {results.filter(e => e.deep_right).length} / {results.length}
          </p>
          <p>
            BP Better : {results.filter(e => e.bp_right && !e.deep_right).length} / {results.length}
          </p>
          <p>
            Deep Better : {results.filter(e => e.deep_right && !e.bp_right).length} / {results.length}
          </p>
        </div>
      </div>
    </Container>
  )
}
export default NewQnA
