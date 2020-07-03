import * as sdk from 'botpress/sdk'

import en from '../translations/en.json'
import fr from '../translations/fr.json'

const entryPoint: sdk.ModuleEntryPoint = {
  translations: { en, fr },
  definition: {
    name: 'info-source',
    fullName: 'MSSS Info Covid-19',
    noInterface: true, // This prevents your module from being displayed in the menu, since we only add custom components here
    homepage: 'https://botpress.com',
  },
}

export default entryPoint
