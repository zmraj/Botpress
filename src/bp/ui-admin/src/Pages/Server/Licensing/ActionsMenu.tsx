import {
  Button,
  Classes,
  Intent,
  Menu,
  MenuDivider,
  MenuItem,
  Popover,
  PopoverInteractionKind,
  Position
} from '@blueprintjs/core'
import { LicenseKeyDetails } from 'common/licensing-service'
import _ from 'lodash'
import moment from 'moment'
import React, { FC, Fragment, useEffect, useState } from 'react'
import api from '~/api'
import { toastFailure, toastSuccess } from '~/utils/toaster'

import UploadModal from './UploadModal'

interface ActionsDropdownProps {
  showUploadModal: () => void
  onLicenseUpdate: () => void
}

const ActionsDropdown: FC<ActionsDropdownProps> = props => {
  const [keys, setKeys] = useState<LicenseKeyDetails[] | undefined>()

  useEffect(() => {
    const init = async () => {
      const { data: keys } = await api.getSecured().get('/admin/license/keys')
      setKeys(keys)
    }

    // tslint:disable-next-line: no-floating-promises
    init()
  }, [])

  const changeLicense = async (filename: string) => {
    try {
      await api.getSecured().put('/admin/license', { filename })
      toastSuccess('License changed successfully!')
      props.onLicenseUpdate()
    } catch (err) {
      toastFailure(err.message)
    }
  }

  return (
    <Menu className={Classes.ELEVATION_1}>
      <MenuItem
        icon="style"
        text="Change License Key"
        popoverProps={{
          interactionKind: PopoverInteractionKind.CLICK
        }}
      >
        {keys &&
          keys.map(key => {
            const { endDate, keyName } = key.licenseInfo
            const usage = `${key.usedBy.length}/${key.licenseInfo.maxWorkspaces}`
            return (
              <MenuItem
                key={keyName || ''}
                onClick={() => changeLicense(key.filename)}
                disabled={!key.isAvailable}
                text={`${keyName} - expires on ${moment(endDate).format('YYYY-MM-DD')} (${usage} workspaces)`}
              />
            )
          })}
      </MenuItem>
      <MenuItem icon="add" text="Upload new license" onClick={props.showUploadModal} />
      <MenuDivider />
      <MenuItem icon="add" text="Purchase new license" onClick={() => (window.location.href = 'https://botpress.io')} />
    </Menu>
  )
}

interface ActionsMenuProps {
  onLicenseUpdate: () => void
}

const ActionsMenu: FC<ActionsMenuProps> = props => {
  const [isModalOpen, setModalOpen] = useState(false)

  return (
    <Fragment>
      <Popover minimal position={Position.BOTTOM}>
        <Button intent={Intent.NONE} text="Actions" rightIcon="caret-down" />
        <ActionsDropdown showUploadModal={() => setModalOpen(true)} onLicenseUpdate={props.onLicenseUpdate} />
      </Popover>
      <UploadModal
        isOpen={isModalOpen}
        handleClose={() => setModalOpen(false)}
        onLicenseUpdate={props.onLicenseUpdate}
      />
    </Fragment>
  )
}

export default ActionsMenu
