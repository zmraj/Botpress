import classnames from 'classnames'
import _ from 'lodash'
import React, { Component } from 'react'
import { AbstractNodeFactory, DiagramEngine } from 'storm-react-diagrams'

import { BaseNodeModel } from '../nodes/BaseNodeModel'
import { StandardPortWidget } from '../nodes/Ports'

import style from './style.scss'
import { showHeader } from './utils'

export class VariablesWidget extends Component<{ node: VariablesNodeModel; diagramEngine: any }> {
  render() {
    const node = this.props.node

    return (
      <div className={classnames(style.baseNode, style.nodeListen, { [style.highlightedNode]: node.isHighlighted })}>
        {showHeader({ nodeType: 'Variables', nodeName: node.name, isStartNode: node.isStartNode })}
        <div className={style.ports}>
          <StandardPortWidget name="in" node={node} className={style.in} />
          <StandardPortWidget name="out0" node={node} className={style.out} />
        </div>
      </div>
    )
  }
}

export class VariablesNodeModel extends BaseNodeModel {
  constructor({ id, x, y, name, onEnter = [], next = [], isStartNode = false, isHighlighted = false }) {
    super('variables', id)
    this.setData({ name, onEnter, next, isStartNode, isHighlighted })

    this.x = this.oldX = x
    this.y = this.oldY = y
  }
}

export class VariablesWidgetFactory extends AbstractNodeFactory {
  constructor() {
    super('variables')
  }

  generateReactWidget(diagramEngine: DiagramEngine, node: VariablesNodeModel) {
    return <VariablesWidget node={node} diagramEngine={diagramEngine} />
  }

  getNewInstance() {
    // @ts-ignore
    return new VariablesNodeModel()
  }
}
