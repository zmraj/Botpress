import React, { Component, Fragment } from 'react'
import { FormGroup, NumericInput, InputGroup, Switch, H4 } from '@blueprintjs/core'
import { connect } from 'react-redux'

class VariablesNode extends Component {
  render() {
    const buildKeyForSchemaItem = (memoryType, type, name) => {
      return `${memoryType}.${type}.${name}`
    }
    const schema = this.props.memorySchema
    const user = schema.user
    const temp = schema.temp

    const handleNumericChange = (val, key) => {
      this.props.updateNode({ bleh: 'lol' })
    }

    const renderSchemEntry = (memoryType, entry) => {
      const key = entry[0]
      const value = entry[1]
      const type = value.type
      if (type === 'number') {
        return (
          <FormGroup key={buildKeyForSchemaItem(memoryType, type, key)} inline={true} label={key}>
            <NumericInput onValueChange={val => handleNumericChange(val, key)} />
          </FormGroup>
        )
      } else if (type === 'string') {
        return (
          <FormGroup key={buildKeyForSchemaItem(memoryType, type, key)} inline={true} label={key}>
            <InputGroup />
          </FormGroup>
        )
      } else if (type === 'boolean') {
        return (
          <FormGroup key={buildKeyForSchemaItem(memoryType, type, key)} inline={true} label={key}>
            <Switch />
          </FormGroup>
        )
      }
    }

    return (
      <Fragment>
        <H4>User</H4>
        {Object.entries(user).map(entry => renderSchemEntry('user', entry))}
        <H4>Temp</H4>
        {Object.entries(temp).map(entry => renderSchemEntry('temp', entry))}
      </Fragment>
    )
  }
}

const mapStateToProps = state => ({
  memorySchema: state.bot.memorySchema
})

const mapDispatchToProps = {}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VariablesNode)
