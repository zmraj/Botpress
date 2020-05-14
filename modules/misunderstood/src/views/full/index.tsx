import { Button, InputGroup, Intent, NonIdealState } from '@blueprintjs/core'
import * as sdk from 'botpress/sdk'
import { utils } from 'botpress/shared'
import { Container, SidePanel } from 'botpress/ui'
import _ from 'lodash'
import React, { FC, useEffect, useRef } from 'react'

import { ApiFlaggedEvent, ContextMessage } from '../../types'

import { makeApi } from './v2/api'
import style from './v2/style.scss'
import Prediction from './v2/Prediction'
import Progress from './v2/Progress'
import StickyActionBar from './v2/StickyActionBar'
import ChatPreview from './MainScreen/ChatPreview'

interface Props {
  bp: any
  contentLang: string
}

export type Resolution = 'done' | 'deleted' | 'skipped'

export interface ProgressHistory {
  position?: number
  eventId: number
  utterance: string
  positive_examples: string[]
  language: string
  resolution: Resolution
}

export type FullProgressHistory = {
  negative_examples: string[]
} & ProgressHistory

export const keyMap = {
  moveUtteranceUp: 'up',
  moveUtteranceDown: 'down',
  moveIntentUp: 'ctrl+up',
  moveIntentDown: 'ctrl+down',
  markSelected: 'space',
  unMarkSelected: 'ctrl+space',
  focusSearch: 'ctrl+f',
  loseFocus: 'esc',
  goToNextTask: 'right',
  goToPreviousTask: 'left',
  acceptMarkedUtterances: 'a',
  ignoreFlaggedEvent: 'i',
  unMarkAllUtterances: 'r',
  goToIntentIndex: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
}

interface State {
  filterDuplicates: boolean
  loading: boolean
  eventDetails: ApiFlaggedEvent
  events: ApiFlaggedEvent[]
  intents: sdk.NLU.IntentDefinition[]
  predictions: any
  markedUtterance: string[]
  history: ProgressHistory[]
  query: string
  currentUtterance: string
  currentEventIndex: number
  intentIndex: number
  uttIndex: number
  language: string
}

const getHistoryEntry = (event: ApiFlaggedEvent, resolution: Resolution, utterances?: string[]): ProgressHistory => {
  return {
    eventId: event.id,
    utterance: event.context.find(x => x.isCurrent).preview,
    positive_examples: utterances ?? [],
    resolution,
    language: event.language
  }
}

const mainReducer = (state: State, action): State => {
  const { type, data } = action

  if (type === 'setup') {
    const { events, intents } = action.data
    return {
      ...state,
      events: state.filterDuplicates ? _.uniqBy(events, 'preview') : events,
      intents,
      currentEventIndex: 0
    }
  } else if (type === 'loadEvent') {
    const { context, resolutionParams } = data
    const query = context.find(x => x.isCurrent).preview

    return {
      ...state,
      eventDetails: data,
      query,
      markedUtterance: resolutionParams?.utterances ?? [],
      loading: true,
      uttIndex: 0,
      intentIndex: 0
    }
  } else if (type === 'moveIntentUp') {
    const nextIndex = state.intentIndex - 1
    if (nextIndex > -1) {
      return { ...state, intentIndex: nextIndex, uttIndex: 0 }
    }
  } else if (type === 'moveIntentDown') {
    return { ...state, intentIndex: state.intentIndex + 1, uttIndex: 0 }
  } else if (type === 'moveUtteranceUp') {
    const nextIndex = state.uttIndex - 1
    if (nextIndex >= 0) {
      return { ...state, uttIndex: nextIndex }
    }

    const prevIntentIndex = state.intentIndex - 1
    if (prevIntentIndex > -1) {
      const intentName = state.predictions[prevIntentIndex]?.label
      const intent = state.intents.find(x => x.name === intentName)
      const utteranceCount = intent?.utterances[state.language].length ?? 0

      return { ...state, intentIndex: prevIntentIndex, uttIndex: utteranceCount - 1 }
    }
  } else if (type === 'moveUtteranceDown') {
    return { ...state, uttIndex: state.uttIndex + 1 }
  } else if (type === 'markUtterance') {
    if (state.markedUtterance.length < 3) {
      return { ...state, markedUtterance: [...state.markedUtterance, data] }
    }
  } else if (type === 'unMarkUtterance') {
    if (!data) {
      return { ...state, markedUtterance: [] }
    }
    const idx = state.markedUtterance.findIndex(x => x === data)
    if (idx !== -1) {
      return {
        ...state,
        markedUtterance: [...state.markedUtterance.slice(0, idx), ...state.markedUtterance.slice(idx + 1)]
      }
    }
  } else if (type === 'changeEvent') {
    return { ...state, markedUtterance: [] }
  } else if (type === 'updatePredictions') {
    return { ...state, predictions: _.take(data, 7), loading: false }
  } else if (type === 'setIntentIndex') {
    return { ...state, intentIndex: data }
  } else if (type === 'setCurrentUtterance') {
    return { ...state, currentUtterance: data }
  } else if (type === 'setPredictQuery') {
    return { ...state, query: data, loading: true }
  } else if (type === 'goToNextTask') {
    const newIndex = state.currentEventIndex + 1
    if (newIndex < state.events.length) {
      return { ...state, currentEventIndex: newIndex, loading: true }
    }
  } else if (type === 'goToPrevTask') {
    const nextIndex = state.currentEventIndex - 1
    if (nextIndex > -1) {
      return { ...state, currentEventIndex: nextIndex, loading: true }
    }
  } else if (type === 'addToHistory') {
    const existing = state.history.find(x => x.eventId === data.eventId)
    if (!existing) {
      return { ...state, history: [{ ...data, position: state.history.length + 1 }, ...state.history] }
    }
  } else if (type === 'updateHistory') {
    const existing = state.history.find(x => x.eventId === data.eventId)
    if (existing) {
      const newHistory = [
        ...state.history.filter(x => x.eventId !== data.eventId),
        { ...existing, resolution: data.resolution, utterances: data.utterances }
      ]

      return {
        ...state,
        history: _.orderBy(newHistory, 'position', 'desc')
      }
    }
  } else if (type === 'focusUtterance') {
    return { ...state, uttIndex: data.uttIndex, intentIndex: data.intentIndex }
  } else if (type === 'toggleDuplicates') {
    return { ...state, filterDuplicates: !state.filterDuplicates }
  }

  return { ...state }
}

const Main: FC<Props> = props => {
  const api = makeApi(props.bp)

  const [state, dispatch] = React.useReducer(mainReducer, {
    language: props.contentLang,
    filterDuplicates: false,
    loading: false,
    eventDetails: undefined,
    events: [],
    intents: [],
    predictions: [],
    markedUtterance: [],
    history: [],
    query: '',
    currentUtterance: '',
    currentEventIndex: -1,
    intentIndex: 0,
    uttIndex: 0
  })

  const {
    events,
    intents,
    loading,
    filterDuplicates,
    currentEventIndex,
    eventDetails,
    query,
    predictions,
    currentUtterance,
    markedUtterance,
    history,
    intentIndex,
    uttIndex,
    language
  } = state

  useEffect(() => {
    // tslint:disable-next-line: no-floating-promises
    loadEvents()
  }, [])

  useEffect(() => {
    // tslint:disable-next-line: no-floating-promises
    loadEvent(events?.[currentEventIndex]?.id)
  }, [currentEventIndex, events])

  useEffect(() => {
    // tslint:disable-next-line: no-floating-promises
    debouncePredict(query)
  }, [query])

  useEffect(() => {
    // tslint:disable-next-line: no-floating-promises
    loadEvents()
  }, [filterDuplicates])

  const loadEvents = async () => {
    dispatch({
      type: 'setup',
      data: { intents: await api.fetchIntents(), events: await api.fetchEvents(props.contentLang) }
    })
  }

  const extractNlu = async query => {
    if (query) {
      const predict = await api.predict(query, [])
      const preds = predict.nlu.predictions

      const ajustedPreds = _.flatMap(Object.keys(preds), p => {
        return preds[p].intents.map(i => ({ label: i.label, confidence: i.confidence * preds[p].confidence }))
      })

      const withoutNone = ajustedPreds.filter(x => x.label !== 'none')
      const ordered = _.orderBy(withoutNone, 'confidence', 'desc')

      console.log(ordered)

      dispatch({ type: 'updatePredictions', data: ordered })
    }
  }

  const debouncePredict = useRef(_.debounce(extractNlu, 400)).current
  const searchInput = useRef(null)

  const loadEvent = async (eventId: number) => {
    if (eventId) {
      const event = await api.fetchEvent(eventId)

      dispatch({ type: 'loadEvent', data: event })
      dispatch({ type: 'addToHistory', data: getHistoryEntry(event, 'skipped', markedUtterance) })
    }
  }

  const getIntentName = (context: ContextMessage[]) => {
    const fullEvent = context.find(x => x.isCurrent)?.['event']

    const nduQna = fullEvent.ndu?.actions.find(x => x.action === 'send')?.data?.sourceDetails
    const stdQna = fullEvent.nlu?.intent?.name

    return nduQna ?? stdQna
  }

  const saveEvent = async (resolution: Resolution) => {
    const intentName = getIntentName(eventDetails.context)

    const historyEntry = {
      ...getHistoryEntry(eventDetails, resolution, markedUtterance),
      negative_examples: intents.find(x => x.name === intentName)?.utterances?.[language] ?? [],
      language
    }

    await api.updateEvent(eventDetails.id, resolution, historyEntry)

    dispatch({ type: 'updateHistory', data: historyEntry })
    dispatch({ type: 'goToNextTask' })
  }

  const switchIntent = (isNext: boolean) => {
    if (isNext) {
      keyHandlers.moveIntentDown()
    } else {
      keyHandlers.moveIntentUp()
    }
  }

  const utteranceClicked = (text: string, uttIndex: number, intentIndex: number, add?: boolean) => {
    dispatch({ type: add ? 'markUtterance' : 'unMarkUtterance', data: text })
    dispatch({ type: 'focusUtterance', data: { intentIndex, uttIndex } })
  }

  const skipToNextTask = () => {
    dispatch({ type: 'addToHistory', data: getHistoryEntry(eventDetails, 'skipped') })
    dispatch({ type: 'goToNextTask' })
  }

  const keyHandlers = {
    moveIntentUp: () => dispatch({ type: 'moveIntentUp' }),
    moveIntentDown: () => dispatch({ type: 'moveIntentDown' }),

    moveUtteranceUp: () => dispatch({ type: 'moveUtteranceUp' }),
    moveUtteranceDown: () => dispatch({ type: 'moveUtteranceDown' }),
    markSelected: () => dispatch({ type: 'markUtterance', data: currentUtterance }),
    unMarkSelected: () => dispatch({ type: 'unMarkUtterance', data: currentUtterance }),

    goToPreviousTask: () => dispatch({ type: 'goToPrevTask' }),
    goToNextTask: () => skipToNextTask(),
    goToIntentIndex: e => dispatch({ type: 'setIntentIndex', data: +e.key }),

    loseFocus: () => document.getElementById('hotkeyContainer').focus(),
    focusSearch: e => {
      e.preventDefault()
      searchInput.current.focus()
    },

    unMarkAllUtterances: () => {
      if (!utils.isInputFocused()) {
        dispatch({ type: 'unMarkUtterance' })
      }
    },
    acceptMarkedUtterances: async () => {
      if (!utils.isInputFocused()) {
        await saveEvent('done')
      }
    },
    ignoreFlaggedEvent: async () => {
      if (!utils.isInputFocused()) {
        await saveEvent('deleted')
      }
    }
  }

  return (
    <Container sidePanelWidth={400} keyHandlers={keyHandlers} keyMap={keyMap}>
      <SidePanel>
        <Progress
          api={api}
          history={history}
          currentEvent={eventDetails}
          loadEvent={loadEvent}
          filterDuplicates={filterDuplicates}
          toggleDuplicates={() => dispatch({ type: 'toggleDuplicates' })}
          eventsCount={events?.length ?? 0}
          language={language}
        />

        <div className={style.chatPreview}>{eventDetails && <ChatPreview messages={eventDetails.context} />}</div>
      </SidePanel>

      <div className={style.mainView}>
        <div className={style.input}>
          <InputGroup
            value={query}
            autoFocus
            inputRef={searchInput as any}
            onChange={e => dispatch({ type: 'setPredictQuery', data: e.currentTarget.value })}
          />
        </div>

        <div>
          {loading && <NonIdealState title="Loading" description="Querying NLU predictions..."></NonIdealState>}
          {!loading &&
            predictions?.map((x, idx) => (
              <Prediction
                key={x.label}
                intents={intents}
                index={idx}
                intentName={x.label}
                lang={props.contentLang}
                confidence={x.confidence}
                isActive={idx === intentIndex}
                setCurrentUtterance={utt => dispatch({ type: 'setCurrentUtterance', data: utt })}
                markedUtterance={markedUtterance}
                switchIntent={switchIntent}
                uttIndex={uttIndex}
                utteranceClicked={utteranceClicked}
              />
            ))}
        </div>

        <StickyActionBar>
          <Button text="Accept" intent={Intent.SUCCESS} onClick={async () => await saveEvent('done')}></Button>
          <Button text="Ignore" intent={Intent.DANGER} onClick={async () => await saveEvent('deleted')}></Button>
          <Button text="Skip" intent={Intent.WARNING} onClick={skipToNextTask}></Button>
        </StickyActionBar>
      </div>
    </Container>
  )
}

export default Main
