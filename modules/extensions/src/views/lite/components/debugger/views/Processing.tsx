import { Icon, Intent } from '@blueprintjs/core'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'
import moment from 'moment'
import React, { FC } from 'react'

import en from '../../../../../translations/en.json'
import fr from '../../../../../translations/fr.json'
import style from '../style.scss'

const translations = { fr, en }

export const Processing: FC<{ event: sdk.IO.Event; lang: string }> = props => {
  const { processing } = props.event

  const processed = Object.keys(processing)
    .map(key => {
      const [type, name, status] = key.split(':')
      return { type, name, status, completed: moment(processing[key]) }
    })
    .map((curr, idx, array) => {
      return { ...curr, execTime: idx === 0 ? 0 : curr.completed.diff(array[idx - 1].completed) }
    })

  const withoutSkipped = processed.filter(x => x.status !== 'skipped')
  const totalExec = _.sumBy(withoutSkipped, x => x.execTime)

  // TODO: Better translation implementation for "lite" modules
  const lang = {
    tr: (item: string) => _.get(translations[props.lang], item) || _.get(translations['en'], item)
  }

  return (
    <div className={style.subSection}>
      {withoutSkipped.map((entry, idx) => {
        let time
        if (entry.type === 'completed') {
          time = `Total: ${totalExec} ms`
        } else if (entry.type !== 'received') {
          time = `${entry.execTime || 0} ms`
        }

        return (
          <div className={style.processing}>
            <div>
              {idx}.
              {entry.status === 'error' ? (
                <Icon icon="small-cross" intent={Intent.DANGER} />
              ) : (
                <Icon icon="small-tick" intent={Intent.SUCCESS} />
              )}
              {lang.tr(`processing.${entry.type}`)} {entry.name ? ' - ' + entry.name : ''}
            </div>
            <div>{time}</div>
          </div>
        )
      })}
    </div>
  )
}
