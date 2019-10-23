import { buildInstructionsFromVariables, getVariableValue, parseInstruction } from './VariablesNode'

describe('parseInstruction', () => {
  test('undefined', () => {
    expect(() => parseInstruction(undefined)).toThrow('Invalid instructions')
  })
  test('empty', () => {
    expect(() => parseInstruction('')).toThrow('Invalid instructions')
  })
  test('wrong prefix', () => {
    expect(() => parseInstruction(`wrongprefix ${JSON.stringify({ a: 1 })}`)).toThrow('Invalid instructions')
  })
  test('invalid JSON', () => {
    expect(() => {
      parseInstruction('setVariables lol')
    }).toThrow(SyntaxError)
  })
  test('valid JSON', () => {
    expect(parseInstruction(`setVariables ${JSON.stringify({ a: 1 })}`)).toEqual({ a: 1 })
  })
})

describe('buildInstructionsFromVariables', () => {
  test('variables object', () => {
    expect(buildInstructionsFromVariables({ a: 1 })).toEqual([`setVariables ${JSON.stringify({ a: 1 })}`])
  })
})

describe('getVariableValue', () => {
  test('is ok', () => {
    expect(getVariableValue('user', 'name', { user: { name: 1 } })).toEqual(1)
  })

  test('memory type does not exist', () => {
    expect(() => getVariableValue('temp', 'name', { user: { name: 1 } })).toThrow()
  })

  test('variable does not exist', () => {
    expect(() => getVariableValue('user', 'city', { user: { name: 1 } })).toThrow()
  })

  test('variables are empty', () => {
    expect(() => getVariableValue('user', 'city', {})).toThrow()
  })
})
