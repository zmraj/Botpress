import 'bluebird-global'
import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'

const runBinary = async (command: string[], waitTime: number) => {
  const binDir = path.dirname(process.env.BINARY_PATH!)
  const executable = path.basename(process.env.BINARY_PATH!)
  const args = {
    cwd: binDir,
    env: {
      NATIVE_EXTENSIONS_DIR: path.resolve(`${process.env.BINDING_PATH || binDir}/bindings`),
      APP_DATA_PATH: path.resolve(`${process.env.DATA_PATH || binDir}/data`)
    }
  }

  return Promise.fromCallback(async cb => {
    let output
    const instance = execFile(executable, command, args, async (err, stdout, stderr) => {
      output = stdout
    })

    await Promise.delay(waitTime)
    instance.kill()
    await Promise.delay(500)

    cb(undefined, output)
  })
}

describe('Testing Binary Integrity', () => {
  const runTests = process.env.BINARY_TEST && process.env.BINARY_PATH

  // Since a suite needs at least one test..
  it('Pre-verification', () => {
    if (!runTests) {
      return
    }

    expect(fs.existsSync(process.env.BINARY_PATH!)).toBe(true)
    expect(fs.statSync(process.env.BINARY_PATH!).isFile()).toBe(true)
  })

  // We don't want this test to run with the normal test suite
  if (!runTests) {
    return
  }

  it('Main process execution', async () => {
    const result = await runBinary([], 20000)
    expect(result).not.toContain('Error starting botpress')
    expect(result).not.toContain('Cannot find module')
    expect(result).toContain('Botpress Server')
    expect(result).toContain('Botpress is ready')
  }, 25000)

  it('Test push command', async () => {
    const result = await runBinary(['push'], 1000)
    expect(result).not.toContain('Error starting botpress')
    expect(result).toContain('Missing parameter')
  })

  it('Test pull command', async () => {
    const result = await runBinary(['pull'], 1000)
    expect(result).not.toContain('Error starting botpress')
    expect(result).toContain('Missing parameter')
  })

  it('Benchmarking performances test', async () => {
    const result = await runBinary(['bench'], 4000)
    expect(result).not.toContain('Error starting botpress')
    expect(result).toContain(`Couldn't reach your bot`)
  })

  it('Language server startup', async () => {
    const result = await runBinary(['lang'], 2000)
    expect(result).not.toContain('Error starting botpress')
    expect(result).toContain(`Botpress Language Server`)
    expect(result).toContain(`Language Server is ready at`)
  })
})
