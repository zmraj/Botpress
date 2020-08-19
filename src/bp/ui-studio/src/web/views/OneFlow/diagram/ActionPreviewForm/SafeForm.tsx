import { Console } from 'console'
import React from 'react'

class SafeForm extends React.Component<any> {
  state = {
    isError: false
  }

  componentDidUpdate(prevProps) {
    if (prevProps.children !== this.props.children) {
      this.setState({ isError: false })
    }
  }

  componentDidCatch(error, info) {
    console.log('Error', error, info)
    this.setState({ isError: true })
  }

  render() {
    if (this.state.isError) {
      return <div>error</div>
    }

    return this.props.children
  }
}

export default SafeForm
