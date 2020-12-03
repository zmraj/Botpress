import http from 'k6/http'
import { sleep } from 'k6'

export default function() {
  http.post(
    // `http://localhost:3000/api/v1/bots/test/converse/user${__VU}`,
    `http://localhost:3000/version`,
    {
      type: 'text',
      text: 'Hey!'
    },
    {
      headers: { 'Content-Type': 'application/json' }
    }
  )
  // http.get(`http://localhost:3000/api/v1/bots/test/converse/user${__VU}`)

  sleep(0.1)
}
