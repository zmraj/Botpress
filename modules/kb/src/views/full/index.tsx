import { Button } from '@blueprintjs/core'
import { Container } from 'botpress/ui'
import cx from 'classnames'
import React, { Component } from 'react'
import { Panel } from 'react-bootstrap'

interface Props {
  contentLang: string
  bp: any
}

export default class KbPage extends Component<Props> {
  state = {}

  // fetchFlows() {
  //   this.props.bp.axios.get('/flows').then(({ data }) => {
  //     const flows = data.filter(flow => !flow.name.startsWith('skills/'))
  //     const flowsList = reorderFlows(flows).map(({ name }) => ({ label: getFlowLabel(name), value: name }))

  //     this.setState({ flows: data, flowsList })
  //   })
  // }

  render() {
    return (
      <Container sidePanelHidden>
        <div />
        <Panel className={cx('kbContainer')}>
          <Panel.Body>
            <Button onClick={() => this.props.bp.axios.post(`/mod/kb/train`)}>Train</Button>
            <Button onClick={() => this.props.bp.axios.post(`/mod/kb/train/cancel`)}>Cancel</Button>
          </Panel.Body>
        </Panel>
      </Container>
    )
  }
}
