import { Provider } from 'mobx-react'
import React from 'react'

import { RootStore } from '../full/store'
import Editor from '../full/Editor'

export default class CodeEditor extends React.Component<{ bp: any; fileName: any; onChange: any }> {
  private store: RootStore

  constructor(props) {
    super(props)
    this.store = new RootStore({ bp: this.props.bp })
  }

  componentDidMount() {
    this.store.editor.hello = this.props.onChange
    if (this.props.fileName) {
      // tslint:disable-next-line: no-floating-promises
      this.store.editor.openFile(this.props.fileName)
      setTimeout(() => {
        this.store.editor.resizeLayout()
      }, 2000)
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.fileName !== this.props.fileName) {
      // tslint:disable-next-line: no-floating-promises
      this.store.editor.openFile(this.props.fileName)
    }
  }

  render() {
    console.log('Rendering!', this.props)

    return (
      <Provider store={this.store}>
        <Editor />
      </Provider>
    )
  }
}
