import { Button, Checkbox, Icon, Intent, Popover, ProgressBar, Tag } from '@blueprintjs/core'
import cx from 'classnames'
import { ProgressHistory } from 'full'
import _ from 'lodash'
import React, { FC } from 'react'

import { ApiFlaggedEvent } from '../../../types'

import { makeApi } from './api'
import style from './style.scss'

interface Props {
  api: ReturnType<typeof makeApi>
  history: ProgressHistory[]
  currentEvent?: ApiFlaggedEvent
  language: string
  eventsCount?: number
  loadEvent: (eventId: number) => void
  filterDuplicates: boolean
  toggleDuplicates: (checked: boolean) => void
}

const Progress: FC<Props> = props => {
  const { api, history, currentEvent, eventsCount } = props

  const exportJson = async () => {
    const json = await api.fetchEvents(props.language, 'pending')
    const prepared = json.map(x => ({
      utterance: x.preview,
      createdAt: x.createdAt,
      ..._.pick(x.resolutionParams, ['positive_examples', 'negative_examples', 'language'])
    }))

    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify(prepared, undefined, 2)]))
    link.download = 'misunderstood.json'
    link.click()
  }

  const done = eventsCount - history.length
  const percentCompleted = (eventsCount - done) / eventsCount

  return (
    <div className={style.progressBox}>
      <div style={{ float: 'right' }}>
        <Popover>
          <Button icon="settings"></Button>
          <div style={{ padding: 10 }}>
            <Checkbox
              checked={props.filterDuplicates}
              label="Filter duplicates"
              onChange={e => props.toggleDuplicates(e.currentTarget.checked)}
            />

            <Button icon="export" text="Export JSON" onClick={exportJson} />
          </div>
        </Popover>
      </div>
      <h4>Progress</h4>
      Events: {history.length} / {props.eventsCount}
      <ProgressBar value={percentCompleted} stripes={false}></ProgressBar>
      <h4>History</h4>
      {history?.map((entry, idx) => {
        let icon: any = <Icon icon="blank" />
        if (entry.resolution === 'done') {
          icon = <Icon icon="small-tick" intent={Intent.SUCCESS} />
        } else if (entry.resolution === 'deleted') {
          icon = <Icon icon="small-cross" intent={Intent.DANGER} />
        }

        return (
          <div
            key={entry.utterance}
            onClick={() => props.loadEvent(entry.eventId)}
            className={cx({ [style.activeHistory]: entry.eventId === currentEvent.id })}
          >
            {icon}
            {entry.position}. {entry.utterance}
          </div>
        )
      })}
    </div>
  )
}

export default Progress
