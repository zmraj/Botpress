import { HeaderButtonProps, lang, MainContent } from 'botpress/shared'
import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import { flowEditorRedo, flowEditorUndo } from '~/actions'
import { canFlowRedo, canFlowUndo } from '~/reducers'

import style from './style.scss'

const CodeEditorToolbar = props => {
  const tabs = [
    {
      id: 'code-editor',
      title: lang.tr('code editor')
    }
  ]

  const buttons: HeaderButtonProps[] = [
    {
      icon: 'disable',

      tooltip: lang.tr('Discard')
      // onClick: props.
    },
    {
      icon: 'floppy-disk',

      tooltip: lang.tr('Save')
      // onClick: props.redo
    }
  ]

  return <MainContent.Header className={style.header} tabs={tabs} buttons={buttons} tabChange={props.tabChange} />
}

const mapStateToProps = state => ({
  canUndo: canFlowUndo(state),
  canRedo: canFlowRedo(state)
})

const mapDispatchToProps = {
  undo: flowEditorUndo,
  redo: flowEditorRedo
}

export default connect(mapStateToProps, mapDispatchToProps)(CodeEditorToolbar)
