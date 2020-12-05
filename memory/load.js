import http from 'k6/http'
import { sleep } from 'k6'

export default function() {
  http.post(`http://localhost:3000/api/v1/bots/test/converse/user${__VU}`, {
    type: 'text',
    text: `Hey! from ${__VU}`
  })
  sleep(1)
}
