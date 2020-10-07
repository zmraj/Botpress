import { Button, Checkbox, FormGroup, InputGroup } from '@blueprintjs/core'
// @ts-ignore
import ContentPickerWidget from 'botpress/content-picker'
import { InfoTooltip } from 'botpress/ui'
import { toast } from 'botpress/shared'
import cx from 'classnames'
import React, { FC, useEffect, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { AuthGateData } from '../../backend/authGate'

import style from './style.scss'
import { SkillProps } from './typings'

export interface AuthGateProps {
  loginMessage: string
  inviteMessage: string
  promptLogin: boolean
  inviteCodeRetry: number
}

export const AuthGate: FC<SkillProps<AuthGateData>> = props => {
  const [inviteCodeRetry, setInviteCodeRetry] = useState<number>(3)
  const [promptLogin, setPromptLogin] = useState<boolean>(false)
  const [loginMessage, setLoginMessage] = useState<string>()
  const [inviteMessage, setInviteMessage] = useState<string>()

  useEffect(() => {
    props.onDataChanged({ loginMessage, inviteMessage, promptLogin, inviteCodeRetry })
    props.onValidChanged(true)
  }, [loginMessage, inviteMessage, promptLogin])

  useEffect(() => {
    const { loginMessage, inviteMessage, promptLogin, inviteCodeRetry } = props.initialData

    setPromptLogin(promptLogin)
    setLoginMessage(loginMessage)
    setInviteMessage(inviteMessage)
    setInviteCodeRetry(inviteCodeRetry || 3)

    props.resizeBuilderWindow('small')
  }, [])

  return (
    <div>
      <div className={style.element} style={{ display: 'flex' }}>
        <Checkbox
          checked={promptLogin}
          onChange={e => setPromptLogin(e.currentTarget.checked)}
          label="Prompt for login if user is unauthenticated"
        />

        <div style={{ marginLeft: 5 }}>
          <InfoTooltip
            text="When checked, user will be asked to login if they are not already
        logged in. Otherwise, it will only act as a simple gate: allow or disallow"
          />
        </div>
      </div>

      {promptLogin && (
        <div>
          <div className={style.element}>
            <div className={style.title}>Login prompt message (required)</div>
            <ContentPickerWidget
              itemId={loginMessage}
              onChange={content => setLoginMessage(content.id)}
              placeholder="Select a content element"
            />

            <blockquote className={cx('bp3-blockquote', style.details)}>
              Login URL Markdown{'  '}
              <InfoTooltip text="Copy and paste that small snippet of code in your text message to display a clickable URL in the chat for users to authenticate" />
              <br />
              <code>[Login Link]({`{{temp.login_url}}`}) </code>
              <CopyToClipboard
                text={`[Login Link]({{temp.login_url}})`}
                onCopy={() => toast.info('Copied to clipboard')}
              >
                <Button icon="clipboard" minimal={true} />
              </CopyToClipboard>
            </blockquote>
          </div>

          <div className={style.element}>
            <div className={style.title}>Message for invite code (if rollout strategy requires it)</div>
            <ContentPickerWidget
              itemId={inviteMessage}
              onChange={content => setInviteMessage(content.id)}
              placeholder="Message asking for invite code"
            />
          </div>

          <div className={style.element} style={{ maxWidth: 200 }}>
            <FormGroup label="Retry limit for invite code">
              <InputGroup
                value={inviteCodeRetry.toString()}
                onChange={e => setInviteCodeRetry(Number(e.currentTarget.value))}
              />
            </FormGroup>
          </div>
        </div>
      )}
    </div>
  )
}
