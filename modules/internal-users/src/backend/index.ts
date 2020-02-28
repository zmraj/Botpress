import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'

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
  definition: {
    name: 'internal-users',
    menuIcon: 'users',
    fullName: 'Internal Users',
    homepage: 'https://botpress.io',
    noInterface: true,
    plugins: [],
    moduleView: { stretched: true }
  },
  skills: skillsToRegister
}

export default entryPoint
