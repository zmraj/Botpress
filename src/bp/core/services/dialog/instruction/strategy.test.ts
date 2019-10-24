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
  _.assign(state.bot, variables.bot)
  _.assign(state.temp, variables.temp)
  _.assign(state.session, variables.session)
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

  test('bot state', () => {
    const state = buildEmptyState()
    _.set(state, 'bot.a', 1)
    const variables = buildEmptyVariables()
    _.set(variables, 'bot.b', 1)

    assignVariablesToState(state, variables)

    expect(state.bot).toEqual({ a: 1, b: 1 })
  })

  test('temp state', () => {
    const state = buildEmptyState()
    _.set(state, 'temp.a', 1)
    const variables = buildEmptyVariables()
    _.set(variables, 'temp.b', 1)

    assignVariablesToState(state, variables)

    expect(state.temp).toEqual({ a: 1, b: 1 })
  })

  test('session state', () => {
    const state = buildEmptyState()
    _.set(state, 'session.a', 1)
    const variables = buildEmptyVariables()
    _.set(variables, 'session.b', 1)

    assignVariablesToState(state, variables)

    expect(state.session).toEqual({ a: 1, b: 1, lastMessages: [] })
  })
})
