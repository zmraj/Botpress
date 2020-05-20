import { Icon, Intent } from '@blueprintjs/core'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'
import moment from 'moment'
import React, { FC } from 'react'

import style from '../style.scss'

export const Processing: FC<{ event: sdk.IO.Event }> = props => {
  const { processing } = props.event

  const processed = Object.keys(processing)
    .map(key => {
      const [type, name, status] = key.split(':')
      return { type, name, status, completed: moment(processing[key]) }
    })
    .map((curr, idx, array) => {
      return { ...curr, execTime: idx === 0 ? 0 : curr.completed.diff(array[idx - 1].completed) }
    })

  const getType = type => {
    switch (type) {
      case 'received':
        return 'Event Received'
      case 'stateLoaded':
        return 'Loaded User State'
      case 'hook':
        return 'Hook'
      case 'mw':
        return 'Middleware'
      case 'dialogEngine':
        return 'Processing Dialog'
      case 'action':
        return 'Action'
      case 'completed':
        return 'Event Processing Completed'
    }
  }

  return (
    <div className={style.subSection}>
      {processed
        .filter(x => x.status !== 'skipped')
        .map((entry, idx) => {
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {idx}.
                {entry.status === 'error' ? (
                  <Icon icon="small-cross" intent={Intent.DANGER} />
                ) : (
                  <Icon icon="small-tick" intent={Intent.SUCCESS} />
                )}
                {getType(entry.type)} {entry.name ? ' - ' + entry.name : ''}
              </div>
              <div>{entry.execTime || 0} ms</div>
            </div>
          )
        })}
    </div>
  )
}
