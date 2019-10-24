import * as sdk from 'botpress/sdk'
import _ from 'lodash'

interface Variables {
  user: object
  session: object
  temp: object
  bot: object
}

const assignVariablesToState = (state: sdk.IO.EventState, variables: Variables) => {
  _.assign(state.user, variables.user)
}

const buildEmptyState = () => {
  return {
    user: {},
    session: {
      lastMessages: []
    },
    temp: {},
    bot: {},
    context: {},
    __stacktrace: []
  }
}

const buildEmptyVariables = () => {
  return {
    user: {},
    session: {},
    temp: {},
    bot: {}
  }
}

describe('assignVariablesToState', () => {
  test('empty state and variables', () => {
    const state = buildEmptyState()
    const variables = buildEmptyVariables()

    assignVariablesToState(state, variables)

    expect(state).toEqual(buildEmptyState())
  })

  test('non-empty state and variables', () => {
    const state = buildEmptyState()
    _.set(state, 'user.a', 1)
    const variables = buildEmptyVariables()

    assignVariablesToState(state, variables)

    expect(state.user).toEqual({ a: 1 })
  })

  test('non-empty state and non-empty variables with same key', () => {
    const state = buildEmptyState()
    _.set(state, 'user.a', 1)
    const variables = buildEmptyVariables()
    _.set(variables, 'user.a', 1)

    assignVariablesToState(state, variables)

    expect(state.user).toEqual({ a: 1 })
  })

  test('non-empty state and non-empty variables with different keys', () => {
    const state = buildEmptyState()
    _.set(state, 'user.a', 1)
    const variables = buildEmptyVariables()
    _.set(variables, 'user.b', 1)

    assignVariablesToState(state, variables)

    expect(state.user).toEqual({ a: 1, b: 1 })
  })
})
