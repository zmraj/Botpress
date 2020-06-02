import api from '../api'

export const FETCH_LICENSING_RECEIVED = 'license/FETCH_LICENSING_RECEIVED'

const initialState = {
  licensing: null
}

export default (state = initialState, action) => {
  switch (action.type) {
    case FETCH_LICENSING_RECEIVED:
      return {
        ...state,
        licensing: action.licensing
      }

    default:
      return state
  }
}

export const fetchLicensing = () => {
  return async dispatch => {
    const { data } = await api.getSecured({ toastErrors: false }).get(`admin/license/status`)

    dispatch({
      type: FETCH_LICENSING_RECEIVED,
      licensing: data.payload
    })

    try {
      const { data } = await api
        .getSecured({ toastErrors: false })
        .post(`https://telemetry.botpress.io/ingest`, { test: '123' })
      console.log(data)
    } catch (err) {
      console.error(err)
    }

    // if (data.payload.telemetry?.length) {
    //   console.log('TELEM')
    //   for(const entry of data.payload.telemetry){
    //     const { data } = await api.getSecured({ toastErrors: false }).post(`https://telemetrye.botpress.io/ingest`, entry)
    //     console.log(data.)
    //   }

    //   //
    // }
  }
}
