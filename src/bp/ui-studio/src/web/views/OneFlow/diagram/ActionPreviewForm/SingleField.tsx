import { Button, Tab, Tabs, TextArea } from '@blueprintjs/core'
import { FlowNode } from 'botpress/sdk'
import { Contents, lang, MoreOptions, MoreOptionsItems, RightSidebar } from 'botpress/shared'
import React, { FC, Fragment, useEffect, useState } from 'react'
import ActionDialog from '~/views/FlowBuilder/nodeProps/ActionDialog'

import { Action, ActionInfo, parseActionString } from '../nodes/ActionContents'
import { BlockModel } from '../nodes/Block'
import style from '../ActionForm/style.scss'

import { Collapsible } from './Collapsible'

const SingleField: FC<any> = ({ key, defaultValue, onValid }) => {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    console.log('RESET', defaultValue)
    setValue(defaultValue)
  }, [defaultValue])

  return (
    <Collapsible name={key}>
      <TextArea
        rows={7}
        style={{ width: '100%' }}
        onChange={e => {
          const val = e.currentTarget.value

          setValue(val)
          try {
            console.log('evaled', eval(val))
            onValid(eval(val))
          } catch (err) {
            console.log('parse error', err)
          }
        }}
        value={value}
      ></TextArea>
    </Collapsible>
  )
}

export default SingleField
