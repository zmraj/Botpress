import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import en from '../translations/en.json'

import authGate from './authGate'

const skillsToRegister: sdk.Skill[] = [
  {
    id: 'AuthGate',
    name: 'Auth Gate',
    icon: 'shield',
    flowGenerator: authGate.generateFlow
  }
]

const entryPoint: sdk.ModuleEntryPoint = {
  translations: { en },
  definition: {
    name: 'internal-users',
    menuIcon: 'users',
    fullName: 'Internal Users',
    homepage: 'https://botpress.io',
    noInterface: true,
    experimental: true
  },
  skills: skillsToRegister
}

export default entryPoint
