import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'
import { Card, CardBody } from 'reactstrap'

import { setActiveWorkspace } from '../Auth'
import logo from '../media/nobg_white.png'
import api from '../api'

//TODO more work here
class WorkspacePicker extends Component {
  state = {
    hasWorkspace: false,
    workspaces: []
  }

  componentDidMount() {
    this.loadWorkspaces()
  }

  async loadWorkspaces() {
    const { data: workspaces } = await api.getSecured().get('/auth/me/workspaces')

    if (workspaces.length === 1) {
      setActiveWorkspace(workspaces[0].workspace)
      this.setState({ hasWorkspace: true })
    } else {
      this.setState({ workspaces })
    }
  }

  selectWorkspace = workspace => {
    setActiveWorkspace(workspace)
    this.setState({ hasWorkspace: true })
  }

  render() {
    if (this.state.hasWorkspace) {
      return <Redirect to="/" />
    }

    if (this.state.workspaces.length) {
      return (
        <div className="centered-container">
          <div className="middle">
            <div className="inner">
              <img className="logo" src={logo} alt="loading" />
              <Card body>
                <CardBody className="login-box">
                  Choose a workspace:
                  <br />
                  {this.state.workspaces.map(w => {
                    return (
                      <div>
                        <a onClick={() => this.selectWorkspace(w.workspace)}>{w.workspace}</a>
                      </div>
                    )
                  })}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="centered-container">
        <div className="middle">
          <div className="inner">
            <img className="logo" src={logo} alt="loading" />
            <Card body>
              <CardBody className="login-box">Sorry, you don't have access to any workspace.</CardBody>
            </Card>
          </div>
        </div>
      </div>
    )
  }
}

export default WorkspacePicker
