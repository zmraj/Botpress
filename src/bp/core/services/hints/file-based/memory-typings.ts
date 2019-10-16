import * as ts from 'typescript'

import { Hint } from '..'

export default class MemoryTypingsHints {
  readonly filePattern = ['bots/*/memoryTypings.ts']

  indexFile(filePath: string, content: string): Hint[] {
    const hints: Hint[] = []

    const program = ts.createProgram(['/Users/spg/botpress/out/bp/data/bots/mybot1/memoryTypings.ts'], {})
    const checker = program.getTypeChecker()
    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        // Walk the tree to search for classes
        ts.forEachChild(sourceFile, visit)
      }
    }

    function visit(node: ts.Node) {
      if (ts.isClassDeclaration(node)) {
        node.members.map(member => {
          if (ts.isPropertyDeclaration(member)) {
            const symbol = checker.getSymbolAtLocation(member.name)
            const name = `event.state.user.${symbol!.name}`
            hints.push({
              category: 'PROPERTIES',
              description: 'Test description',
              source: 'Extracted from memory typings',
              location: 'File: ' + filePath,
              parentObject: '',
              name,
              partial: false,
              scope: 'inputs'
            })
          }
        })
      }
      ts.forEachChild(node, visit)
    }

    return hints
  }
}
