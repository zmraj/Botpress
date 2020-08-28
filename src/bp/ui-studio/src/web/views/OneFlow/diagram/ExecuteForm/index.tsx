import { Button, Tab, Tabs, Tooltip } from '@blueprintjs/core'
import { BotEvent, ExecuteNode, FlowNode, FlowVariable } from 'botpress/sdk'
import { Contents, Dropdown, Icons, lang, MoreOptions, MoreOptionsItems, RightSidebar } from 'botpress/shared'
// import ActionModalSmall from '~/views/FlowBuilder/nodeProps/ActionModalSmall'
import cx from 'classnames'
import { Variables } from 'common/typings'
import e from 'express'
import React, { FC, Fragment, useEffect, useRef, useState } from 'react'
import InjectedModuleView from '~/components/PluginInjectionSite/module'

import contentStyle from '../ContentForm/style.scss'

import style from './style.scss'

interface Props {
  deleteNode: () => void
  close: () => void
  node: FlowNode
  customKey: string
  contentLang: string
  variables: Variables
  events: BotEvent[]
  onUpdate: (data: any) => void
  onUpdateVariables: (variable: FlowVariable) => void
  formData: ExecuteNode
}

const emptyAction = `
  const myAction = async () => {
    \u00A0\u00A0
    bp.logger.info('lol')
  }
  return myAction()`

const ExecuteForm: FC<Props> = ({
  close,
  node,
  customKey,
  deleteNode,
  onUpdate,
  variables,
  events,
  formData,
  contentLang,
  onUpdateVariables
}) => {
  const [showOptions, setShowOptions] = useState(false)
  const [maximized, setMaximized] = useState(false)

  const originalCode = useRef(formData?.code ?? emptyAction)
  const params = useRef([])

  useEffect(() => {
    toggleSize()
  }, [])

  useEffect(() => {
    if (formData) {
      originalCode.current = formData.code
      refreshArgs()
    } else {
      originalCode.current = emptyAction
    }
  }, [customKey])

  const moreOptionsItems: MoreOptionsItems[] = [
    {
      label: lang.tr('deleteNode'),
      action: deleteNode,
      type: 'delete'
    }
  ]

  const toggleSize = () => {
    document.documentElement.style.setProperty('--right-sidebar-width', maximized ? '240px' : '580px')
    setMaximized(!maximized)
  }

  const fields: any = [
    {
      type: 'group',
      key: 'variables',
      label: lang.tr('Variables'),
      fields: [
        {
          type: 'variable',
          key: 'name',
          label: 'Variable',
          variableTypes: variables.display.map(x => x.type),
          placeholder: 'module.builtin.setValueToPlaceholder'
        }
      ],
      group: {
        addLabel: lang.tr('Add Parameter'),
        minimum: 1,
        contextMenu: [
          {
            type: 'delete',
            label: 'delete'
          }
        ]
      }
    }
  ]

  const refreshArgs = () => {
    params.current = formData?.variables.map(name => {
      const type = variables.currentFlow.find(v => v.params?.name === name)?.type
      let realType
      if (type === 'date') {
        realType = 'BPVariable.Date.VariableDate'
      } else if (type === 'string') {
        realType = 'BPVariable.String.VariableString'
      }

      return { name: name, type: realType ?? `sdk.BoxedVariable<${type ?? 'any'}>` }
    })
  }

  const handleCodeChanged = data => {
    onUpdate({ code: data.content })
  }

  const onUpdateContent = data => {
    refreshArgs()
    onUpdate({ variables: data.variables.map(x => x.name) })
  }

  return (
    <RightSidebar className={style.wrapper} canOutsideClickClose={true} close={() => close()}>
      <Fragment key={`${node?.id}`}>
        <div className={style.formHeader}>
          <Tabs id="contentFormTabs">
            <Tab id="content" title={lang.tr('studio.flow.nodeType.execute')} />
          </Tabs>
          <div>
            <MoreOptions show={showOptions} onToggle={setShowOptions} items={moreOptionsItems} />
            <Tooltip content={lang.tr(maximized ? 'minimizeInspector' : 'maximizeInspector')}>
              <Button
                className={style.expandBtn}
                small
                minimal
                icon={maximized ? <Icons.Minimize /> : 'fullscreen'}
                onClick={toggleSize}
              />
            </Tooltip>
          </div>
        </div>
        <div className={cx(contentStyle.fieldWrapper, contentStyle.contentTypeField)}>
          <span className={contentStyle.formLabel}>{lang.tr('Action')}</span>

          <Dropdown
            filterable={false}
            className={contentStyle.formSelect}
            items={[{ label: 'Code New Action', value: '' }]}
            rightIcon="chevron-down"
            onChange={option => {
              // handleContentTypeChange(option.value)
            }}
          />
        </div>
        <div className={cx(contentStyle.fieldWrapper, contentStyle.contentTypeField)}>
          <Contents.Form
            currentLang={contentLang}
            variables={variables}
            events={events}
            fields={fields}
            advancedSettings={[]}
            formData={{ variables: (formData?.variables ?? []).map(name => ({ name })) }}
            onUpdate={onUpdateContent}
            onUpdateVariables={onUpdateVariables}
          />
        </div>
        <InjectedModuleView
          moduleName="code-editor"
          componentName="MinimalEditor"
          extraProps={{ code: originalCode.current, maximized, args: params.current, onChange: handleCodeChanged }}
        />
      </Fragment>
    </RightSidebar>
  )
}

export default ExecuteForm
