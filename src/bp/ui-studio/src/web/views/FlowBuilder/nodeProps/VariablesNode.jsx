import React, { Component, Fragment } from 'react'
import { FormGroup, NumericInput, InputGroup, Switch, H4 } from '@blueprintjs/core'
import { connect } from 'react-redux'
import _ from 'lodash'
import { getCurrentFlow } from '~/reducers'

export const getVariableValue = (memoryType, key, variables) => {
  const value = variables[memoryType][key]
  if (value === undefined) {
    throw 'Value not found'
  }

  return value
}

export const parseInstruction = instruction => {
  if (!instruction) {
    throw 'Invalid instructions'
  }
  const parts = instruction.split(' ')

  const prefix = parts[0]
  if (prefix != 'setVariables') {
    throw 'Invalid instructions'
  }
  const variablesString = parts[1]

  return JSON.parse(variablesString)
}

export const buildInstructionsFromVariables = variables => {
  return [`setVariables ${JSON.stringify(variables)}`]
}

const buildKeyForSchemaItem = (memoryType, name) => {
  return `${memoryType}.${name}`
}

class VariablesNode extends Component {
  render() {
    const schema = this.props.memorySchema
    if (!schema) {
      return <div>This bot has no memory Schema defined</div>
    }

    const user = schema.user || {}
    const temp = schema.temp || {}

    return (
      <Fragment>
        <H4>User</H4>
        {Object.entries(user).map(entry => this.renderSchemaEntry('user', entry))}
        <H4>Temp</H4>
        {Object.entries(temp).map(entry => this.renderSchemaEntry('temp', entry))}
      </Fragment>
    )
  }

  renderSchemaEntry = (memoryType, entry) => {
    const key = entry[0]
    const value = entry[1]
    const type = value.type
    const defaultValue = value.default

    const handleNumericChange = (memoryType, key, val) => {
      const setVariables = this.props.node.onEnter[0] || ''
      const variablesString = setVariables.split(' ')[2] || ''
      const variables =
        variablesString === ''
          ? {
              user: {},
              temp: {},
              bot: {},
              session: {}
            }
          : JSON.parse(variablesString)

      variables[memoryType][key] = val

      this.props.updateNode({ onEnter: buildInstructionsFromVariables(variables) })
    }

    const parsedVariables = this.getParsedVariables()
    let variableValue
    try {
      variableValue = getVariableValue(memoryType, key, parsedVariables)
    } catch (e) {
      if (defaultValue) {
        variableValue = defaultValue
      }
    }

    if (type === 'number') {
      return (
        <FormGroup key={buildKeyForSchemaItem(memoryType, key)} inline={true} label={key}>
          <NumericInput value={variableValue} onValueChange={val => handleNumericChange(memoryType, key, val)} />
        </FormGroup>
      )
    } else if (type === 'string') {
      return (
        <FormGroup key={buildKeyForSchemaItem(memoryType, key)} inline={true} label={key}>
          <InputGroup />
        </FormGroup>
      )
    } else if (type === 'boolean') {
      return (
        <FormGroup key={buildKeyForSchemaItem(memoryType, key)} inline={true} label={key}>
          <Switch />
        </FormGroup>
      )
    }
  }

  getParsedVariables = () => {
    const instruction = this.props.node.onEnter[0]
    let parsedVariables = {}
    if (instruction) {
      parsedVariables = parseInstruction(instruction)
    }

    return parsedVariables
  }
}

const extractMemorySchemaFromState = state => {
  const currentFlowName = state.flows.currentFlow
  const currentFlow = state.flows.flowsByName[currentFlowName]
  const nodes = currentFlow.nodes
  const skillFlows = nodes
    .filter(node => {
      return node.type && node.type.startsWith('skill-')
    })
    .map(node => state.flows.flowsByName[node.flow])

  const memorySchemas = skillFlows.filter(flow => flow.memorySchema).map(flow => flow.memorySchema)
  console.log(memorySchemas)
  const newLocal = _.merge({}, ...memorySchemas)
  console.log(newLocal)
  return newLocal
}

const mapStateToProps = state => ({
  memorySchema: extractMemorySchemaFromState(state)
})

const mapDispatchToProps = {}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VariablesNode)
