import { Button, Checkbox, Icon, Intent, Tooltip } from '@blueprintjs/core'
import { Container } from 'botpress/ui'
import React, { useEffect, useState } from 'react'

import { feedback, kb_entry } from '../../backend/typings'
import _ from 'lodash'
import style from './style.scss'

const NewQnA = props => {
  const [question, setQuestion] = useState('')
  const [new_model_name, setNewModelName] = useState('')
  const [pythonImportLogs, setPythonImportLogs] = useState('')
  const [closestQuestions, setClosestQuestions] = useState([])
  const [svmProb, setSvmProb] = useState({ exemples: [], min: 0, max: 0, mean: 0 } as {
    exemples:
    {
      confidence: number,
      utterance: string,
      answer: string,
      eval: number,
    }[],
    min: number,
    max: number,
    mean: number
  })
  const [results, setResults] = useState([
    {
      question: '',
      bp_bot: '',
      deep_bot: '',
      bp_right: false,
      deep_right: false,
      winner: '',
      confidence: 0,
      deep_confidence: 0
    }
  ])
  const [answer, setAnswer] = useState([
    {
      orig: '',
      content: '',
      embedding: [],
      contexts: [],
      confidence: 0,
      feedbacks: [{ utterance: '', polarity: 0, reranked: false } as feedback],
      winner: "botpress" || "deep"
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

  const getSvmProb = async () => {
    const { data } = await props.bp.axios.get('/mod/new_qna/getSvmProb')
    console.log(data)
    setSvmProb(data)
  }
  useEffect(() => { }, [])

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
        <button onClick={getSvmProb}>Get Svm probs on bad utterances</button>
        <h2>Svm Probs</h2>
        <div>
          <p> Mean {svmProb.mean}</p>
          <p> Max {svmProb.max} </p>
          <p> Min {svmProb.min}</p>
          <p> Exemples </p>

          <table>
            <tbody>
              <tr>
                <td>Question</td>
                <td>Confidence</td>
                <td>Answer</td>
                <td>Incorrect</td>
              </tr>
              {svmProb.exemples.sort((a, b) => (a.eval > b.eval) ? -1 : 1).slice(0, 200).map(o => {
                return (
                  <tr>
                    <td>{o.utterance}</td>
                    <td>{o.confidence}</td>
                    <td>{o.answer}</td>
                    <td>{o.eval}</td>
                  </tr>)
              })}
            </tbody>
          </table>
        </div>
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
                <h5> Winner </h5>
                <p> {e.winner} </p>

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
                <td>Conf</td>
                <td>DConf</td>
                <td>Winner</td>
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
                    <td>{_.round(r.confidence, 2)}</td>
                    <td>{_.round(r.deep_confidence, 2)}</td>
                    <td>{r.winner}</td>
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
          <p>
            Repartition BP : {results.filter(e => e.winner == "botpress").length} / {results.length}
          </p>
          <p>
            Repartition Deep : {results.filter(e => e.winner == "deep").length} / {results.length}
          </p>
        </div>
      </div>
    </Container>
  )
}
export default NewQnA
