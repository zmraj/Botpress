import { Button, Checkbox, Icon, Intent, Tooltip } from '@blueprintjs/core'
import { Example, handleBooleanChange, IExampleProps } from '@blueprintjs/docs-theme'
import axios from 'axios'
import { Container, SplashScreen } from 'botpress/ui'
import React, { useEffect, useState } from 'react'

import style from './style.scss'

const Modeltable = props => {
  const [models, setModels] = useState([])
  const [datasets, setDatasets] = useState({ embeddings: [], qa: [], intents: [] } as {
    embeddings: string[]
    qa: string[]
    intents: string[]
  })
  const [new_model_input, setNewModelInput] = useState('')
  const [importReturn, setimportReturn] = useState('')
  const [res, setRes] = useState({})
  const [checked, setChecked] = useState({ embeddings: [], qa: [], intents: [] } as {
    embeddings: string[]
    qa: string[]
    intents: string[]
  })

  const runTests = async () => {
    const { data } = await props.bp.axios.post('/mod/nlu-benchmark/runTests', { checked })
    console.log(data)
    setRes(data)
  }

  const fetchDatasets = async () => {
    const { data } = await props.bp.axios.get('/mod/nlu-benchmark/datasetsName')
    setDatasets(data)
  }
  const fetchModels = async () => {
    const { data } = await props.bp.axios.get('/mod/nlu-benchmark/modelsName')
    setModels(data)
  }

  const importNewTfModel = async () => {
    const { data } = await props.bp.axios.post('/mod/nlu-benchmark/importTfModels', { new_model_input })
    setimportReturn(data)
  }
  const importNewOnnxModel = async () => {
    const { data } = await props.bp.axios.post('/mod/nlu-benchmark/importOnnxModels', { new_model_input })
    console.log(data)
    setimportReturn(data)
  }

  useEffect(() => {
    fetchModels().catch(e => console.log(e))
    fetchDatasets().catch(e => console.log(e))
  }, [])

  const changeCheckedState = (event: React.FormEvent<HTMLInputElement>) => {
    const updatedChecked = { ...checked }
    if (updatedChecked[event.currentTarget.name].includes(event.currentTarget.id)) {
      updatedChecked[event.currentTarget.name] = updatedChecked[event.currentTarget.name].filter(
        e => e !== event.currentTarget.id
      )
    } else {
      updatedChecked[event.currentTarget.name].push(event.currentTarget.id)
    }
    setChecked(updatedChecked)
  }

  return (
    <Container sidePanelHidden>
      <div />
      <div className={style.table}>
        <h1> Existing Models </h1>
        <table>
          <tbody>
            {models.map((model: string, index) => {
              return (
                <tr key={model}>
                  <td>{model}</td>
                  <td>
                    <Checkbox
                      id={model}
                      name={'embeddings'}
                      label={'embeddings'}
                      checked={checked.embeddings.includes(model)}
                      onChange={event => changeCheckedState(event)}
                    />
                  </td>
                  <td>
                    <Checkbox
                      id={model}
                      name={'qa'}
                      label={'qa'}
                      checked={checked.qa.includes(model)}
                      onChange={event => changeCheckedState(event)}
                    />
                  </td>
                  <td>
                    <Checkbox
                      id={model}
                      name={'intents'}
                      label={'intents'}
                      checked={checked.intents.includes(model)}
                      onChange={event => changeCheckedState(event)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div>
          Tests embeddings to launch :
          <ul>
            {checked.embeddings.map((name: string, idx: number) => {
              return <li key={'emb' + name}>{name}</li>
            })}
          </ul>
        </div>
        <div>
          Tests qa to launch :
          <ul>
            {checked.qa.map((name: string, idx: number) => {
              return <li key={'qa' + name}>{name}</li>
            })}
          </ul>
        </div>
        <div>
          Tests intents to launch :
          <ul>
            {checked.intents.map((name: string, idx: number) => {
              return <li key={'intent' + name}>{name}</li>
            })}
          </ul>
        </div>
        <div>
          <button onClick={runTests}>Launch tests</button>
        </div>
        <div>
          <input
            type="text"
            value={new_model_input}
            onChange={event => {
              setNewModelInput(event.target.value)
            }}
          />
          <button onClick={importNewOnnxModel}>Import new Onnx model</button>
          <button onClick={importNewTfModel}>Import new TF model</button>
        </div>
        <div>{importReturn}</div>
        <div>
          {Object.entries(res).map(([type, data]: [string, { models: string[]; data: { string: string[] } }], idx) => {
            return (
              <div key={idx}>
                <h1 key={type}>{type}</h1>
                <table>
                  <tbody>
                    <tr>
                      <td>Models</td>
                      {data.models.map(model_name => {
                        return <td key={model_name}>{model_name}</td>
                      })}
                    </tr>
                    {Object.entries(data.data).map(([mot, values], index) => {
                      return (
                        <tr>
                          <td>{mot}</td>
                          {values.map(e => {
                            return <td>{e}</td>
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </Container>
  )
}
// {for(){}}
// {data.map((d, i) => {
//   return (
//     <p key={d}>
//       {d[0]}&nbsp;&nbsp;&nbsp;&nbsp;
//       {d[1]}
//     </p>
//   )
// })}

// export default Modeltable

// class Modeltable extends React.Component {
//   state = { model: [] }
//   async componentDidMount() {
//     const { data } = await this.props.bp.axios.get('/mod/nlu-benchmark/modelsName')
//     this.setState({ model: data })
//   }
//   // componentDidUpdate(prevState, prevProps) {
//   //   if (this.state.filter != prevState.filter) {
//   //   }
//   // }
//   render() {
//     return (
//       <Container sidePanelHidden={true} yOverflowScroll={true}>
//         <div className='model-list'>
//           <h1> Existing Models </h1>
//           <table>
//             <tbody>
//               {this.state.model.map((model, _) => {
//                 return (
//                   <tr key={model}>
//                     <td>{model}</td>
//                     <td>{'skill'}</td>
//                     <td>{'skill2'}</td>
//                   </tr>
//                 )
//               })}
//             </tbody>
//           </table>
//         </div>
//       </Container>
//     )
//   }
// }
export default Modeltable
