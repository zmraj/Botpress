import React, { Component, Fragment } from 'react'
import { FormGroup, NumericInput, InputGroup, Switch } from '@blueprintjs/core'

export default class VariablesNode extends Component {
  render() {
    const schema = [
      {
        name: 'age',
        type: 'number',
        memoryType: 'user'
      },
      {
        name: 'city',
        type: 'string',
        memoryType: 'user'
      },
      { name: 'name', type: 'string', memoryType: 'temp' },
      { name: 'isgood', type: 'boolean', memoryType: 'temp' }
    ]

    const buildKeyForSchemaItem = property => {
      return `${property.memoryType}.${property.type}.${property.name}`
    }

    return (
      <Fragment>
        {schema.map(property => {
          if (property.type === 'number') {
            return (
              <FormGroup key={buildKeyForSchemaItem(property)} inline={true} label={property.name}>
                <InputGroup />
              </FormGroup>
            )
          } else if (property.type === 'string') {
            return (
              <FormGroup key={buildKeyForSchemaItem(property)} inline={true} label={property.name}>
                <InputGroup />
              </FormGroup>
            )
          } else if (property.type === 'boolean') {
            return (
              <FormGroup key={buildKeyForSchemaItem(property)} inline={true} label={property.name}>
                <Switch />
              </FormGroup>
            )
          }
        })}
      </Fragment>
    )
  }
}
