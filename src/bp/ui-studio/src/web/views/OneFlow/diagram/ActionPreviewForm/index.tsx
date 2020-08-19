import { Button, Tab, Tabs, TextArea } from '@blueprintjs/core'
import { FlowNode } from 'botpress/sdk'
import { Contents, lang, MoreOptions, MoreOptionsItems, RightSidebar } from 'botpress/shared'
import React, { FC, Fragment, useEffect, useState } from 'react'
import ActionDialog from '~/views/FlowBuilder/nodeProps/ActionDialog'

import { Action, ActionInfo, parseActionString } from '../nodes/ActionContents'
import { BlockModel } from '../nodes/Block'
import style from '../ActionForm/style.scss'

import { Collapsible } from './Collapsible'
import SafeForm from './SafeForm'
import SingleField from './SingleField'

interface RawField {
  key: string
  code: string
}

const ActionPreviewForm: FC<any> = ({ varTypes }) => {
  const [showModal, setShowModal] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [fields, setFields] = useState([])
  const [rawFields, setRawFields] = useState<RawField[]>([])

  const moreOptionsItems: MoreOptionsItems[] = [
    {
      label: lang.tr('deleteNode'),

      type: 'delete'
    }
  ]

  useEffect(() => {
    console.log(varTypes)
    if (varTypes) {
      const mapped = varTypes?.map(x => ({
        type: x.type === 'boolean' ? 'checkbox' : 'text',
        key: x.variable,
        placeholder: 'What is it for?',
        label: 'My variable'
      }))

      setFields(mapped)
      setRawFields(mapped.map(x => ({ key: x.key, code: JSON.stringify(x, undefined, 2) })))
    }
  }, [varTypes])

  return (
    <RightSidebar className={style.wrapper} canOutsideClickClose={!showModal} close={() => close()}>
      <Fragment key={`test`}>
        <div className={style.formHeader}>
          <Tabs id="contentFormTabs">
            <Tab id="content" title={lang.tr('action preview')} />
          </Tabs>
          <MoreOptions show={showOptions} onToggle={setShowOptions} items={moreOptionsItems} />
        </div>
        <div className={style.actionModal}>
          {/* {fields?.map((field, index) => {
            return (
              <SingleField
                key={field.key}
                defaultValue={JSON.stringify(field, undefined, 2)}
                onValid={v => console.log('vALID', v)}
              ></SingleField>
            )
          })} */}
          {rawFields?.map((field, index) => {
            return (
              <Collapsible name={field.key}>
                <TextArea
                  rows={7}
                  style={{ width: '100%' }}
                  onChange={e => {
                    const val = e.currentTarget.value

                    setRawFields([
                      ...rawFields.slice(0, index),
                      { key: field.key, code: val },
                      ...rawFields.slice(index + 1)
                    ])

                    try {
                      setFields([...fields.slice(0, index), JSON.parse(val), ...fields.slice(index + 1)])
                    } catch (err) {}
                  }}
                  value={field.code}
                ></TextArea>
              </Collapsible>
            )
          })}

          <SafeForm>
            <Contents.Form
              currentLang={'en'}
              fields={fields || []}
              formData={{}}
              onUpdate={data => console.log(data)}
            />
          </SafeForm>
        </div>
      </Fragment>
    </RightSidebar>
  )
}

export default ActionPreviewForm
