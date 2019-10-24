import * as sdk from 'botpress/sdk'
import _ from 'lodash'

export interface Variables {
  user: object
  session: object
  temp: object
  bot: object
}

export const assignVariablesToState = (state: sdk.IO.EventState, variables: Variables) => {
  _.assign(state.user, variables.user)
  _.assign(state.bot, variables.bot)
  _.assign(state.temp, variables.temp)
  _.assign(state.session, variables.session)
}
