import { Button, Checkbox, FormGroup, InputGroup } from '@blueprintjs/core'
// @ts-ignore
import ContentPickerWidget from 'botpress/content-picker'
import { lang, toast } from 'botpress/shared'
import { InfoTooltip } from 'botpress/ui'
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
      <div className={cx(style.element, style.flex)}>
        <Checkbox
          checked={promptLogin}
          onChange={e => setPromptLogin(e.currentTarget.checked)}
          label={lang.tr('module.internal-users.promptUnauthenticated')}
        />

        <div style={{ marginLeft: 5 }}>
          <InfoTooltip text={lang.tr('module.internal-users.whenChecked')} />
        </div>
      </div>

      {promptLogin && (
        <div>
          <div className={style.element}>
            <div className={style.title}>{lang.tr('module.internal-users.loginPromptMessage')}</div>
            <ContentPickerWidget
              itemId={loginMessage}
              onChange={content => setLoginMessage(content.id)}
              placeholder={lang.tr('module.internal-users.selectContent')}
            />

            <blockquote className={cx('bp3-blockquote', style.details)}>
              {lang.tr('module.internal-users.loginUrl')}
              {'  '}
              <InfoTooltip text={lang.tr('module.internal-users.urlTooltip')} />
              <br />
              <code>{lang.tr('module.internal-users.loginLink')}</code>
              <CopyToClipboard
                text={lang.tr('module.internal-users.loginLink')}
                onCopy={() => toast.info(lang.tr('module.internal-users.copiedToClipboard'))}
              >
                <Button icon="clipboard" minimal />
              </CopyToClipboard>
            </blockquote>
          </div>

          <div className={style.element}>
            <div className={style.title}>{lang.tr('module.internal-users.inviteMessage')}</div>
            <ContentPickerWidget
              itemId={inviteMessage}
              onChange={content => setInviteMessage(content.id)}
              placeholder={lang.tr('module.internal-users.invitePlaceholder')}
            />
          </div>

          <div className={cx(style.element, style.retry)}>
            <FormGroup label={lang.tr('module.internal-users.retryLimit')}>
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
