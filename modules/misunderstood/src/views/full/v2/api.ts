import { AxiosInstance } from 'axios'
import { Resolution } from 'full'

import { ApiFlaggedEvent } from '../../../types'

export const makeApi = (bp: { axios: AxiosInstance }) => ({
  fetchEvents: (lang: string, type: string = 'new') =>
    bp.axios.get(`/mod/misunderstood/events/${type}?language=${lang}`).then(res => res.data),

  fetchEvent: async (eventId: number): Promise<ApiFlaggedEvent> =>
    bp.axios.get(`/mod/misunderstood/events/${eventId}`).then(res => res.data),

  fetchEventCount: async (lang: string): Promise<{ [type: string]: number }> =>
    bp.axios.get(`/mod/misunderstood/events/count?language=${lang}`).then(res => res.data),

  fetchIntents: async () => bp.axios.get('/mod/nlu/intents').then(res => res.data),

  predict: async (text: string, contexts: string[]) =>
    bp.axios.post('/mod/nlu/predict', { contexts, text }).then(res => res.data),

  updateEvent: (id: number, action: Resolution, payload: any) =>
    bp.axios
      .post(`/mod/misunderstood/events/${id}/status`, {
        status: action === 'deleted' ? 'deleted' : 'pending',
        resolutionType: 'intent',
        resolution: action,
        resolutionParams: JSON.stringify(payload)
      })
      .then(res => res.data)
})
