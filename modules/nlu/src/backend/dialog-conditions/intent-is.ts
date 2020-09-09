import { Condition, IO } from 'botpress/sdk'
import _ from 'lodash'

const extractContext = (event: IO.IncomingEvent, params: any) => {
  const { topicName } = params
  const intentName = params.intentName ?? `${params.wfName}/${params.nodeName}/${params.conditionIndex}`

  const topic = _.get(event, `nlu.predictions.${topicName}`, {
    intents: [],
    confidence: 0,
    oos: 0,
    name: topicName
  })

  const intent = topic.intents.find((x: any) => x.label.toLowerCase() === intentName.toLowerCase()) || {
    label: intentName,
    confidence: 0
  }

  return { topic, intent }
}

export default {
  id: 'user_intent_is',
  label: 'module.nlu.conditions.userWantsTo',
  description: "The user's intention is {intentName}",
  displayOrder: 0,
  advancedSettings: [],
  fields: [
    {
      key: 'utterances',
      type: 'text_array',
      superInput: true,
      customPlaceholder: true,
      translated: true,
      variablesOnly: true,
      label: 'module.nlu.intents.label',
      group: {
        addLabel: 'module.nlu.intents.addBtn'
      }
    }
  ],
  evaluate: (event: IO.IncomingEvent, params: any) => {
    const { topic, intent } = extractContext(event, params)
    return (1 - topic.oos) * topic.confidence * intent.confidence
  },
  onElectedSideEffect: (event, params) => {
    const { topic, intent } = extractContext(event, params)
    const slots = intent.slots || {}
    Object.assign(event.nlu, { slots })
    // TODO: put the elected intent's slots in the session
  }
} as Condition
