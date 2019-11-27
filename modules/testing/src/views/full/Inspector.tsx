import { Button, Icon, Tooltip } from '@blueprintjs/core'
import React, { FC, useState } from 'react'
import { Col, Grid, Row } from 'react-bootstrap'
import JSONTree from 'react-json-tree'

import inspectorTheme from './inspectorTheme'
import style from './style.scss'

interface Props {
  receivedEventId: string
  expectedEventId: string
  bp: any
}

export const Inspector: FC<Props> = props => {
  const [received, setReceived] = useState()
  const [expected, setExpected] = useState()

  const load = async () => {
    try {
      const { data } = await props.bp.axios.get(`/mod/extensions/events/${props.receivedEventId}`)
      setReceived(data)
    } catch (err) {}

    try {
      const { data } = await props.bp.axios.get(`/mod/extensions/events/${props.expectedEventId}`)
      setExpected(data)
    } catch (err) {}
  }

  if (!props.receivedEventId && !props.expectedEventId) {
    return null
  }

  if (!received && !expected) {
    return (
      <div>
        <Button text="Inspect events" icon="search" onClick={load} />
        <Tooltip content="Depending on your events retention policy, it is possible that some events may not be available or may have been deleted.">
          <Icon icon="info-sign" />
        </Tooltip>
      </div>
    )
  }

  const shouldExpand = (key, data, level) => level <= 1

  return (
    <Grid fluid={true}>
      <Row className={style.reportInteractions}>
        <Col md={6}>
          <div className={style.inspector}>
            <JSONTree
              theme={inspectorTheme}
              data={expected || {}}
              invertTheme={true}
              hideRoot={true}
              shouldExpandNode={shouldExpand}
            />
          </div>
        </Col>
        <Col md={6}>
          <div className={style.inspector}>
            <JSONTree
              theme={inspectorTheme}
              data={received || {}}
              invertTheme={true}
              hideRoot={true}
              shouldExpandNode={shouldExpand}
            />
          </div>
        </Col>
      </Row>
    </Grid>
  )
}
