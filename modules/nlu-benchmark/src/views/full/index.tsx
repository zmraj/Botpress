import { Button, Checkbox, Icon, Intent, Tooltip } from '@blueprintjs/core'
import { Example, handleBooleanChange, IExampleProps } from '@blueprintjs/docs-theme'
import axios from 'axios'
import { Container, SplashScreen } from 'botpress/ui'
import React, { useEffect, useState } from 'react'

import style from './style.scss'

const Modeltable = props => {
  const [models, setModels] = useState([])
  const [checked, setChecked] = useState({ embeddings: [], qa: [], intents: [] } as {
    embeddings: string[]
    qa: string[]
    intents: string[]
  })

  const runTests = async () => {
    console.log(checked)
    await props.bp.axios.post('/mod/nlu-benchmark/runTests', { checked })
  }

  const fetchModel = async () => {
    const { data } = await props.bp.axios.get('/mod/nlu-benchmark/modelsName')
    setModels(data)
  }

  useEffect(() => {
    fetchModel()
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
      </div>
    </Container>
  )
}

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
