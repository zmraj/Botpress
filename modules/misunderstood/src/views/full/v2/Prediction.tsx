import { Icon, Intent, Tag } from '@blueprintjs/core'
import * as sdk from 'botpress/sdk'
import cx from 'classnames'
import _ from 'lodash'
import React, { FC, useEffect } from 'react'

import style from './style.scss'

interface PredProps {
  index: number
  intents: sdk.NLU.IntentDefinition[]
  intentName: string
  confidence: number
  isActive?: boolean
  utterances?: string[]
  uttIndex: number
  lang: string
  setCurrentUtterance: (text: string) => void
  markedUtterance: string[]
  refere: any
  switchIntent: (isNext: boolean) => void
  utteranceClicked: (text: string, uttIndex: number, intentIndex: number, add?: boolean) => void
}

const Prediction: FC<PredProps> = React.forwardRef((props, ref: any) => {
  const { index, intentName, confidence, isActive, uttIndex, lang, markedUtterance } = props

  const intent = props.intents.find(x => x.name === intentName)
  const utterances = props.utterances ?? intent?.utterances?.[lang]

  if (!utterances?.length) {
    return null
  }

  useEffect(() => {
    if (isActive) {
      props.setCurrentUtterance(utterances?.[uttIndex])

      if (uttIndex >= utterances.length) {
        props.switchIntent(true)
      } else if (uttIndex < 0) {
        props.switchIntent(false)
      }
    }
  }, [isActive, uttIndex])

  return (
    <div style={{ padding: 10 }} className={cx(style.intentBox, { [style.activeIntent]: isActive })} ref={ref}>
      <Tag>{index}</Tag> <Tag intent={Intent.PRIMARY}>{_.round(confidence, 2)}%</Tag>
      <span style={{ marginLeft: 30 }}>
        <small>{intentName}</small>
      </span>
      {utterances.map((utt, idx) => (
        <div
          key={utt}
          className={cx(style.utterance, { [style.activeUtterance]: isActive && uttIndex === idx })}
          onClick={() => props.utteranceClicked(utt, idx, index, true)}
          onContextMenu={e => {
            e.preventDefault()
            props.utteranceClicked(utt, idx, index, false)
          }}
        >
          {markedUtterance
            .filter(x => x === utt)
            .map((x, idx) => (
              <Icon key={idx} icon="star"></Icon>
            ))}
          {utt}
        </div>
      ))}
    </div>
  )
})

export default Prediction
