import axios from 'axios'
import _ from 'lodash'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import babylon from 'prettier/parser-babylon'
import prettier from 'prettier/standalone'
import React from 'react'

import { RootStore, StoreDef } from '../store'

import style from './style.scss'
import { addWrapper, removeWrapper } from './wrapper'

const snakeToCamel = str =>
  str.replace(/([-_][a-z0-9])/g, group =>
    group
      .toUpperCase()
      .replace('-', '')
      .replace('_', '')
  )

interface Parameters {
  name: string
  type: string
}

const argsToConst = (params?: Parameters[]) => {
  return (params ?? []).map(x => (x.name?.includes('-') ? `'${x.name}': ${snakeToCamel(x.name)}` : x.name)).join(', ')
}

const argsToInterface = (params?: Parameters[]) => {
  return (params ?? []).map(x => ({ name: x.name?.includes('-') ? `'${x.name}'` : x.name, type: x.type }))
}

interface Props {
  onChange: (data: string) => void
  args?: Parameters
}

export default class MinimalEditor extends React.Component<any> {
  private store: RootStore
  private editor: monaco.editor.IStandaloneCodeEditor
  private editorContainer: HTMLDivElement

  constructor(props) {
    super(props)
    this.store = new RootStore({ bp: this.props.bp })
  }
  state = {
    code: ''
  }

  async componentDidMount() {
    this.setupEditor()

    // tslint:disable-next-line: no-floating-promises
    this.loadTypings()

    // tslint:disable-next-line: no-floating-promises
    this.loadCustomTypings()

    this.loadCodeTypings()
    if (this.props.code) {
      this.setState({ code: this.props.code })
      this.reloadCode(this.props.code)
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.maximized !== this.props.maximized) {
      setTimeout(() => {
        this.editor.layout()
      }, 300)
    }

    if (prevProps.code !== this.props.code) {
      console.log('code')
      this.reloadCode(this.props.code)
    }

    if (prevProps.args !== this.props.args) {
      console.log('args')
      this.loadCodeTypings()
      this.reloadCode(this.state.code)
    }
  }

  componentWillUnmount() {
    const uri = monaco.Uri.parse(`bp://files/index.ts`)
    const oldModel = monaco.editor.getModel(uri)
    if (oldModel) {
      oldModel.dispose()
    }
    this.editor && this.editor.dispose()
  }

  reloadCode(unwrapped: string) {
    console.log('reload')
    const uri = monaco.Uri.parse(`bp://files/index.ts`)

    const oldModel = monaco.editor.getModel(uri)
    if (oldModel) {
      oldModel.setValue(this.wrapCode(unwrapped))
    } else {
      const model = monaco.editor.createModel(this.wrapCode(unwrapped), 'typescript', uri)
      this.editor.setModel(model)
      this.editor.focus()
    }
  }

  wrapCode(code) {
    const args = argsToConst(this.props.args)
    const argStr = args.length ? `const { ${argsToConst(this.props.args)} } = args` : ''

    return addWrapper(code, argStr)
  }

  handleContentChanged = () => {
    const args = argsToConst(this.props.args)
    const argStr = args.length ? `const { ${argsToConst(this.props.args)} } = args` : ''
    const unwrapped = removeWrapper(this.editor.getValue())

    this.props.onChange({ content: unwrapped, args: argStr })
    this.setState({ code: unwrapped })
  }

  loadCustomTypings = async () => {
    const { data } = await this.props.bp.axios.get(`/modules/variables/definitions`, { baseURL: window.API_PATH })
    const realD = data.replace(/export/g, '')

    monaco.languages.typescript.typescriptDefaults.addExtraLib(realD, 'bp://types/custom_variables.d.ts')
    console.log(monaco.languages.typescript.typescriptDefaults.getExtraLibs())
  }

  loadCodeTypings = () => {
    const content = `
      declare var args: Args;
      declare var user: any;
      declare var temp: any;
      declare var session: sdk.IO.CurrentSession;
      declare var bp: typeof sdk;

      interface Args {
        ${argsToInterface(this.props.args).map(x => {
          return `
    ${x.name}: ${x.type}
    `
        })}
      }`

    monaco.languages.typescript.typescriptDefaults.addExtraLib(content, 'bp://types/args.d.ts')
  }

  setupEditor() {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowJs: true,
      typeRoots: ['types']
    })

    monaco.languages.registerDocumentFormattingEditProvider('typescript', {
      async provideDocumentFormattingEdits(model, options, token) {
        const text = prettier.format(model.getValue(), {
          parser: 'babel',
          plugins: [babylon],
          singleQuote: true,
          printWidth: 120,
          trailingComma: 'none',
          semi: false,
          bracketSpacing: true,
          requirePragma: false
        })

        return [
          {
            range: model.getFullModelRange(),
            text
          }
        ]
      }
    })

    this.editor = monaco.editor.create(this.editorContainer, {
      theme: 'vs-light',
      automaticLayout: true,
      lineNumbers: 'on',
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      minimap: {
        enabled: false
      }
    })

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, async () => {
      await this.editor.getAction('editor.action.formatDocument').run()
    })
    // this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KEY_N, this.props.createNewAction)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_P, () =>
      this.editor.trigger('', 'editor.action.quickCommand', '')
    )

    this.editor.onDidChangeModelContent(this.handleContentChanged)
  }

  loadTypings = async () => {
    const typings = await this.store.fetchTypings()

    this.setSchemas(typings)

    _.forEach(typings, (content, name) => {
      if (!name.includes('.schema.')) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, 'bp://types/' + name)
      }
    })
  }

  setSchemas = (typings: any) => {
    const schemas = _.reduce(
      _.pickBy(typings, (content, name) => name.includes('.schema.')),
      (result, content, name) => {
        result.push({
          uri: 'bp://types/' + name,
          schema: JSON.parse(content)
        })
        return result
      },
      []
    )

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      schemas,
      validate: true
    })
  }

  render() {
    return <div id="monaco-editor" ref={ref => (this.editorContainer = ref)} className={style.editor} />
  }
}
