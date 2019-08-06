import { Button, Classes, Dialog, FileInput, Intent, Position, Toaster } from '@blueprintjs/core'
import _ from 'lodash'
import moment from 'moment'
import React, { FC, useState } from 'react'
import api from '~/api'
import { toastFailure, toastSuccess } from '~/utils/toaster'

interface UploadModalProps {
  handleClose: () => void
  isOpen: boolean
  onLicenseUpdate: () => void
}

const UploadModal: FC<UploadModalProps> = props => {
  const [filepath, setFilepath] = useState('')
  const [licenseKey, setLicenseKey] = useState()
  const [licenseData, setLicenseData] = useState()
  const [isInvalid, setIsInvalid] = useState(false)

  const readUserFile = e => {
    setFilepath(e.target.value)
    const file = e.target.files[0]

    const reader = new FileReader()
    reader.readAsArrayBuffer(file)
    reader.onload = async loadedEvent => {
      const fileContent = (loadedEvent.target as FileReader).result as ArrayBuffer
      const enc = new TextDecoder('utf-8')
      const license = { filename: file.name, licenseKey: enc.decode(fileContent) }

      await validateKey(license)
    }
  }

  // TODO more validations & love here
  const validateKey = async license => {
    try {
      const { data } = await api.getSecured().post('/admin/license/validate', license)
      setLicenseKey(license)
      setLicenseData(data)
      /* if (data && data.length) {

      } else {
        setIsInvalid(true)
      }*/
    } catch (err) {
      toastFailure(err.message)
    }
  }

  const uploadFile = async () => {
    try {
      await api.getSecured().post('/admin/license/new', licenseKey)
      closeModal()
      toastSuccess('License added successfully!')
      props.onLicenseUpdate && props.onLicenseUpdate()
    } catch (err) {
      toastFailure(err.message)
    }
  }

  const closeModal = () => {
    setLicenseData(undefined)
    props.handleClose()
  }

  return (
    <Dialog onClose={closeModal} isOpen={props.isOpen} title="Upload new license">
      <div className={Classes.DIALOG_BODY}>
        <p>
          Please select the file which contains your license key. <br />
        </p>
        <p>
          <FileInput text={filepath || 'Choose file...'} onInputChange={readUserFile} />
        </p>
        {licenseData && (
          <div>
            <p>
              <strong>License Details</strong>
            </p>
            <ul>
              <li>
                Name: {licenseData.keyName} (# {licenseData.licenseId})
              </li>
              <li>Expiration: {moment(licenseData.endDate).format('YYYY-MM-DD')}</li>
              <li>Max Workspaces: {licenseData.maxWorkspaces || 0}</li>
              <li>
                Allowed on: <strong>{licenseData.externalUrl || 'No url specified'}</strong>
              </li>
            </ul>
            <p>
              <strong>Limits (per workspace)</strong>
            </p>
            <ul>
              <li>Bots: {licenseData.maxBots || 0}</li>
              <li>Collaborators: {licenseData.maxCollaborators || 0}</li>
              <li>End-users: {licenseData.maxEndUsers || 0}</li>
            </ul>
          </div>
        )}
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={props.handleClose}>Cancel</Button>
          {licenseData && <Button onClick={uploadFile} intent={Intent.PRIMARY} text="Add this key" />}
        </div>
      </div>
    </Dialog>
  )
}

export default UploadModal
