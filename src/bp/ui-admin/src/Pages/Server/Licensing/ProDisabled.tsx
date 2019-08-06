import { Button, Callout } from '@blueprintjs/core'
import _ from 'lodash'
import React, { FC, useState } from 'react'
import api from '~/api'
import { toastFailure } from '~/utils/toaster'

const RebootInProgress = () => {
  return (
    <Callout title={'Server Reboot'} style={{ textAlign: 'center' }}>
      <p>Please wait while the server reboots, this may take a couple of seconds.</p>
    </Callout>
  )
}

const ProDisabled = () => {
  const [isWaiting, setIsWaiting] = useState(false)
  const rebootServer = async () => {
    try {
      await api.getSecured().post('/admin/server/rebootServer')
      setIsWaiting(true)

      setTimeout(() => {
        window.location.reload()
      }, 10000)
    } catch (error) {
      toastFailure(error.message)
    }
  }

  const enableProEdition = async () => {
    if (!window.confirm('Are you sure?')) {
      return
    }

    try {
      const result = await api.getSecured().post('/admin/server/config/enablePro')
      if (result.status === 200) {
        await rebootServer()
      }
    } catch (error) {
      toastFailure(error.message)
    }
  }

  if (isWaiting) {
    return <RebootInProgress />
  }

  return (
    <Callout title={'Enable Botpress Professionnal'} style={{ textAlign: 'center' }}>
      <p>
        Make you use an <strong>official botpress binary or docker image</strong>, you won't be able to activate pro
        otherwise.
      </p>
      <p>
        <u>Method 1</u>
        <br />
        You can enable Botpress Pro by manually editing the file <strong>data/global/botpress.config.json</strong> and
        setting the value <strong>pro.enabled</strong> to true.
      </p>
      <p>
        <u>Method 2</u>
        <br /> Click on the button below. This will enable the required configuration and will automatically reboot the
        server. Please note: Rebooting the server this way will prevent you from reading the logs on screen (except if
        you output logs to the file system).
        <br />
        <br />
        <Button onClick={enableProEdition} text="Enable Pro & Reboot Server" />
      </p>
    </Callout>
  )
}

export default ProDisabled
