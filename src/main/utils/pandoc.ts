// Copy from https://github.com/utatti/simple-pandoc/blob/master/index.js
import { spawn } from 'child_process'
import commandExists from 'command-exists'
import { Readable, PassThrough } from 'stream'
import { isFile2 } from 'common/filesystem'

const pandocCommand = 'pandoc'

const getCommand = (): string => {
  if (envPathExists()) {
    return process.env.MARKTEXT_PANDOC!
  }
  return pandocCommand
}

interface PandocConverter {
  (): Promise<string>
  stream: (srcStream: Readable) => Readable
}

const pandoc = (from: string, to: string, ...args: string[]): PandocConverter => {
  const command = getCommand()
  const option = ['-s', from, '-t', to].concat(args)

  const converter = (() => new Promise<string>((resolve, reject) => {
    const proc = spawn(command, option)
    proc.on('error', reject)
    let data = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    proc.stdout.on('end', () => resolve(data))
    proc.stdout.on('error', reject)
    proc.stdin.end()
  })) as PandocConverter

  converter.stream = (srcStream: Readable) => {
    const proc = spawn(command, option)
    srcStream.pipe(proc.stdin)
    return proc.stdout
  }

  return converter
}

pandoc.exists = (): boolean => {
  if (envPathExists()) {
    return true
  }
  return commandExists.sync(pandocCommand)
}

const envPathExists = (): boolean => {
  return !!process.env.MARKTEXT_PANDOC && isFile2(process.env.MARKTEXT_PANDOC)
}

export default pandoc
