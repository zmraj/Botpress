import { Button, Checkbox, Icon, Intent, Tooltip } from '@blueprintjs/core'
import { confirmDialog, Icons, lang, toast } from 'botpress/shared'
import { Container } from 'botpress/ui'
import _ from 'lodash'
import React, { useState } from 'react'


const Retrieval = props => {
  const [question, setQuestion] = useState('')
  const [answers, setAnswers] = useState([''])
  const askQuestion = async () => {
    const { data } = await props.bp.axios.post('/mod/retrieval/askQuestion', { question })
    setAnswers([data])
  }


  const askFileConfirmation = async uploadFile => {
    if (
      await confirmDialog(`${uploadFile.name} : Are you sure to import ?`, {
        acceptLabel: lang.tr('ok'),
        declineLabel: lang.tr('cancel')
      })
    ) {
      await importFile(uploadFile)
    }
  }

  const importFile = async file => {
    const extension = file.name.split('.').slice(-1)[0]
    if (extension !== 'txt') {
      toast.failure('bad file format')
      return
    }

    let intervalHandle: number
    try {
      const form = new FormData()
      form.append('file', file)

      const { data } = await props.bp.axios.post(`/mod/retrieval/import`, form, props.bp.axiosConfig)
      const uploadStatusId = data

      intervalHandle = window.setInterval(async () => {
        const { data } = await props.bp.axios.get(`/mod/retrieval/upload-status/${uploadStatusId}`)

        if (data === 'sucess') {
          clearInterval(intervalHandle)
          toast.success('Upload sucessful')
        } else if (data !== 'uploading' && data !== 'sucess') {
          toast.failure('Upload crashed')
          clearInterval(intervalHandle)
        }
      }, 500)
    } catch (err) {
      clearInterval(intervalHandle)
      toast.failure(err.message)
    }
  }

  return (
    <Container sidePanelHidden>
      <div />
      <div>
        <p>Information Retrieval module !</p>
        <p>Upload a file</p>
        <input
          type="file"
          onChange={async e => {
            if ((e.target as HTMLInputElement).files) {
              await askFileConfirmation((e.target as HTMLInputElement).files[0])
            }
          }}
        />
        <p>Ask a question</p>
        <input
          type="text"
          value={question}
          onChange={event => {
            setQuestion(event.target.value)
          }}
        />
        <button onClick={askQuestion}>Ask Question</button>
      </div>
      <div>
        <ul>
          {answers.map((a, i) => {return (<li>{a} {i}</li>)})}
        </ul>
      </div>
    </Container>
  )
}
export default Retrieval
