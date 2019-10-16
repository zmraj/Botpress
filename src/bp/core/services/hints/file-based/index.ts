import ActionVariables from './action-vars-provider'
import MemoryTypingsHints from './memory-typings'
import NLUProvider from './nlu-provider'

export default [new ActionVariables(), new NLUProvider(), new MemoryTypingsHints()]
