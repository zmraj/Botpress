import classnames from 'classnames'
import _ from 'lodash'
import React from 'react'
import { Glyphicon, Label, Panel } from 'react-bootstrap'
import { MdExpandLess, MdExpandMore } from 'react-icons/md'

import { ScenarioOverview } from '../../backend/typings'

import style from './style.scss'
import FailureReport from './FailureReport'
import { Inspector } from './Inspector'
import Interaction from './Interaction'

interface Props {
  bp: any
  scenario: ScenarioOverview
  isRunning: boolean
  previews: {
    [key: string]: string
  }
  run: (scenario: any) => void
}

class Scenario extends React.Component<Props> {
  state = {
    expanded: false
  }

  renderStatusLabel = status => {
    if (!status) {
      return
    }

    let labelStyle = 'default'
    if (status === 'fail') {
      labelStyle = 'danger'
    } else if (status === 'pass') {
      labelStyle = 'success'
    }
    return (
      <h5>
        <Label bsStyle={labelStyle}>{status.toUpperCase()}</Label>
      </h5>
    )
  }

  toggleExpanded = expanded => {
    this.setState({ expanded })
  }

  handleRunClick = e => {
    e.stopPropagation()
    this.props.run(this.props.scenario)
  }

  render() {
    const { scenario, isRunning } = this.props
    const pending = scenario.status && scenario.status === 'pending'
    const expanded = this.state.expanded || pending

    const receivedEventId = _.get(scenario, `mismatch.received.eventId`)
    const expectedEventId = _.get(scenario, `mismatch.expected.eventId`)

    return (
      <Panel className={style.scenario} id={scenario.name} expanded={expanded}>
        <Panel.Heading className={style.scenarioHead}>
          <Panel.Title className={style.title} onClick={this.toggleExpanded.bind(this, !expanded)}>
            {expanded && <MdExpandLess />}
            {!expanded && <MdExpandMore />}
            <span>{scenario.name}</span>
            {!isRunning && (
              <Glyphicon onClick={this.handleRunClick} className={classnames(style.run, 'text-success')} glyph="play" />
            )}
          </Panel.Title>
          <div className={style.scenarioStatus}>
            <span>
              {scenario.status && `${scenario.completedSteps} /`} {scenario.steps.length} interactions
            </span>
            {this.renderStatusLabel(scenario.status)}
          </div>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body className={style.scenarioBody}>
            {scenario.steps.map((step, i) => {
              const success = i < scenario.completedSteps
              const failure = scenario.status === 'fail' && i === scenario.completedSteps
              const skipped = scenario.status === 'fail' && i > scenario.completedSteps

              return (
                <Interaction
                  {...step}
                  key={step.userMessage}
                  previews={this.props.previews}
                  success={success}
                  failure={failure}
                  skipped={skipped}
                  maxChars={50}
                  mismatchIdx={scenario.mismatch ? scenario.mismatch.index : null}
                />
              )
            })}
          </Panel.Body>
          {scenario.mismatch && (
            <Panel.Footer className={style.scenarioFooter}>
              <FailureReport
                mismatch={scenario.mismatch}
                failureIdx={scenario.completedSteps + 1}
                skipped={scenario.steps.length - scenario.completedSteps - 1}
                previews={this.props.previews}
              />
              <Inspector bp={this.props.bp} expectedEventId={expectedEventId} receivedEventId={receivedEventId} />
            </Panel.Footer>
          )}
        </Panel.Collapse>
      </Panel>
    )
  }
}

export default Scenario
