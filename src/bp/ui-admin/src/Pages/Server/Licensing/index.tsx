import { Callout } from '@blueprintjs/core'
import { LicensingStatus } from 'common/licensing-service'
import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'

import { fetchLicensing } from '../../../reducers/license'
import LoadingSection from '../../Components/LoadingSection'

import ActionsMenu from './ActionsMenu'
import Banner from './Banner'
import Policies from './Policies'
import ProDisabled from './ProDisabled'

interface Props {
  fetchLicensing: () => void
  licensing: LicensingStatus
  loading: boolean
}

const UnofficialBuild = () => {
  return (
    <Callout title={'Unofficial Build'} style={{ textAlign: 'center' }}>
      <p>
        We noticed that you are running a custom build of Botpress, which doesn't contain the Botpress Professional
        extensions. Make you use an <strong>official botpress binary or docker image</strong>. You won't be able to
        activate <strong>Pro</strong> otherwise.
      </p>
    </Callout>
  )
}

class LicenseStatus extends React.Component<Props> {
  componentDidMount() {
    this.props.fetchLicensing()
  }

  renderOverview() {
    const license = _.get(this.props.licensing, 'license')
    return (
      <div>
        <Banner licensing={this.props.licensing} onLicenseUpdate={this.props.fetchLicensing} />

        <div style={{ display: 'flex' }}>
          <div style={{ width: '80%' }}>
            <div className="license-infos">
              <strong className="license-infos__label">Key Name:</strong>
              {(license && license.keyName) || 'N/A'}
              <span style={{ marginLeft: 10 }}>
                {license && license.licenseId && <small>(#{license.licenseId})</small>}
              </span>
            </div>
            <div className="license-infos">
              <strong className="license-infos__label">Authorized Endpoint:</strong>
              {(license && license.externalUrl) || 'N/A'}
            </div>
            <div className="license-infos">
              <strong className="license-infos__label">Renewal:</strong>
              {license && license.autoRenew ? 'Automatic' : 'Manual'}
            </div>
            <hr />
            {this.props.licensing && (
              <div>
                <h5>Policies</h5>
                <Policies data={this.props.licensing.policyResults} />
              </div>
            )}
          </div>

          <div style={{ width: '20%' }}>
            <ActionsMenu onLicenseUpdate={this.props.fetchLicensing} />
          </div>
        </div>
      </div>
    )
  }

  renderBody() {
    if (this.props.licensing && !this.props.licensing.isBuiltWithPro) {
      return <UnofficialBuild />
    }

    if (this.props.licensing && !this.props.licensing.isPro) {
      return <ProDisabled />
    }

    return this.renderOverview()
  }

  render() {
    return this.props.loading ? <LoadingSection /> : this.renderBody()
  }
}

const mapStateToProps = state => ({
  loading: state.license.loading,
  licensing: state.license.licensing
})
const mapDispatchToProps = { fetchLicensing }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LicenseStatus)
