import http from 'k6/http'
import { sleep } from 'k6'

export default function() {
  http.post(
    `http://localhost:3000/api/v1/bots/test/mod/channel-web/messages/user-${__VU}`,
    {
      type: 'text',
      text: 'Hey!'
    },
    {
      headers: { 'Content-Type': 'application/json' }
    }
  )
  sleep(0.1)
}
