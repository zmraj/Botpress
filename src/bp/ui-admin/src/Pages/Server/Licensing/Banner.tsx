import { Button, Tooltip } from '@blueprintjs/core'
import { LicensingStatus } from 'common/licensing-service'
import _ from 'lodash'
import React from 'react'
import { FC } from 'react'
import api from '~/api'

interface Props {
  onLicenseUpdate: () => void
  licensing: LicensingStatus
}

const Banner: FC<Props> = props => {
  const refreshKey = async () => {
    await api.getSecured().post('/admin/license/refresh')
    await props.onLicenseUpdate()
  }

  const isUnderLimits = _.get(props.licensing, 'status') !== 'breached'
  const isLicensed = _.get(props.licensing, 'status') === 'licensed'

  return (
    <div
      className={'license-status ' + (isLicensed ? 'licensed' : 'unlicensed')}
      style={{ display: 'flex', justifyContent: 'space-between' }}
    >
      <div>
        <span className="license-status__badge" />
        <span className="license-status__status">{isLicensed ? 'Licensed' : 'Unlicensed'}</span>
        <span className="license-status__limits">{isUnderLimits ? 'Under Limits' : 'Limits breached'}</span>
      </div>

      <Tooltip content="Refresh this license now">
        <Button onClick={refreshKey} icon="refresh" />
      </Tooltip>
    </div>
  )
}

export default Banner
