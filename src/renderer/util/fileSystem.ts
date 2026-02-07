import {
  path,
  fs as electronFs,
  os,
  childProcess as cp,
  crypto
} from './tauri'
import dayjs from 'dayjs'
import { Octokit } from '@octokit/rest'
import { isImageFile } from 'common/filesystem/paths'
import { isWindows } from './index'

const { statSync, constants } = electronFs
const tmpdir = (): Promise<string> => os.tmpdir()

// fs-extra 功能的简单实现
// 在 contextIsolation 模式下，我们通过 electronAPI 使用基础 fs 功能

interface MoveOptions {
  overwrite?: boolean
}

interface FseModule {
  ensureDir: (dirPath: string) => Promise<void>
  outputFile: (filepath: string, data: string) => Promise<void>
  move: (src: string, dest: string, options?: MoveOptions) => Promise<void>
  copy: (src: string, dest: string) => Promise<void>
  writeFile: (filepath: string, data: string, encoding?: string) => Promise<void>
  unlink: (filepath: string) => Promise<void>
  stat: (filepath: string) => Promise<any>
  readFile: (filepath: string) => Promise<string>
}

const fse: FseModule = {
  ensureDir: async (dirPath: string): Promise<void> => {
    try {
      await electronFs.mkdir(dirPath, { recursive: true })
    } catch (e: any) {
      if (e.code !== 'EEXIST') throw e
    }
  },
  outputFile: async (filepath: string, data: string): Promise<void> => {
    const dir = path.dirname(filepath)
    await fse.ensureDir(dir)
    await electronFs.writeFile(filepath, data)
  },
  move: async (src: string, dest: string, _options: MoveOptions = {}): Promise<void> => {
    // 简单实现：复制后删除
    await fse.copy(src, dest)
    await electronFs.rm(src, { recursive: true, force: true })
  },
  copy: async (src: string, dest: string): Promise<void> => {
    const stat = await electronFs.stat(src)
    if (stat.isDirectory()) {
      await fse.ensureDir(dest)
      const entries = await electronFs.readdir(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
          await fse.copy(srcPath, destPath)
        } else {
          await electronFs.copyFile(srcPath, destPath)
        }
      }
    } else {
      await electronFs.copyFile(src, dest)
    }
  },
  writeFile: (filepath: string, data: string, encoding?: string): Promise<void> => electronFs.writeFile(filepath, data, { encoding }),
  unlink: (filepath: string): Promise<void> => electronFs.unlink(filepath),
  stat: (filepath: string): Promise<any> => electronFs.stat(filepath),
  readFile: (filepath: string): Promise<string> => electronFs.readFile(filepath)
}

export const create = async (pathname: string, type: string): Promise<void> => {
  return type === 'directory'
    ? fse.ensureDir(pathname)
    : fse.outputFile(pathname, '')
}

export const paste = async ({ src, dest, type }: { src: string; dest: string; type: string }): Promise<void> => {
  return type === 'cut' ? fse.move(src, dest) : fse.copy(src, dest)
}

export const rename = async (src: string, dest: string): Promise<void> => {
  return fse.move(src, dest)
}

export const getHash = (content: string, encoding: string, type: string): any => {
  return crypto.createHash(type).update(content, encoding).digest('hex')
}

export const getContentHash = (content: string): any => {
  return getHash(content, 'utf8', 'sha1')
}

/**
 * Moves an image to a relative position.
 *
 * @param cwd The relative base path (project root or full folder path of opened file).
 * @param relativeName The relative directory name.
 * @param filePath The full path to the opened file in editor.
 * @param imagePath The image to move.
 * @returns The relative path the the image from given `filePath`.
 */
export const moveToRelativeFolder = async (
  cwd: string,
  relativeName: string,
  filePath: string,
  imagePath: string
): Promise<string> => {
  if (!relativeName) {
    // Use fallback name according settings description
    relativeName = 'assets'
  } else if (path.isAbsolute(relativeName)) {
    throw new Error('Invalid relative directory name.')
  }

  // Path combination:
  //  - markdown file directory + relative directory name or
  //  - root directory + relative directory name
  const absPath = path.resolve(cwd, relativeName)
  const dstPath = path.resolve(absPath, path.basename(imagePath))
  await fse.ensureDir(absPath)
  await fse.move(imagePath, dstPath, { overwrite: true })

  // Find relative path between given file and saved image.
  const dstRelPath = path.relative(path.dirname(filePath), dstPath)

  if (isWindows) {
    // Use forward slashes for better compatibility with websites.
    return dstRelPath.replace(/\\/g, '/')
  }
  return dstRelPath
}

export const moveImageToFolder = async (
  pathname: string,
  image: string | File,
  outputDir: string
): Promise<string> => {
  await fse.ensureDir(outputDir)
  const isPath = typeof image === 'string'
  if (isPath) {
    const dirname = path.dirname(pathname)
    const imagePath = path.resolve(dirname, image as string)
    const isImage = isImageFile(imagePath)
    if (isImage) {
      const filename = path.basename(imagePath)
      const extname = path.extname(imagePath)
      const noHashPath = path.join(outputDir, filename)
      if (noHashPath === imagePath) {
        return imagePath
      }
      const hash = getContentHash(imagePath)
      // To avoid name conflict.
      const hashFilePath = path.join(outputDir, `${hash}${extname}`)
      await fse.copy(imagePath, hashFilePath)
      return hashFilePath
    } else {
      return Promise.resolve(image as string)
    }
  } else {
    const file = image as File
    const imagePath = path.join(
      outputDir,
      `${dayjs().format('YYYY-MM-DD-HH-mm-ss')}-${file.name}`
    )
    const binaryString: string = await new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = () => {
        resolve(fileReader.result as string)
      }
      fileReader.readAsBinaryString(file)
    })
    await fse.writeFile(imagePath, binaryString, 'binary')
    return imagePath
  }
}

interface ImageBedGithub {
  owner: string
  repo: string
  branch: string
}

interface ImageBed {
  github: ImageBedGithub
}

interface UploadPreferences {
  currentUploader: string
  imageBed: ImageBed
  githubToken: string
  cliScript: string
}

/**
 * @jocs todo, rewrite it use class
 */
export const uploadImage = async (
  pathname: string,
  image: string | File,
  preferences: UploadPreferences
): Promise<string> => {
  const {
    currentUploader,
    imageBed,
    githubToken: auth,
    cliScript
  } = preferences
  const { owner, repo, branch } = imageBed.github
  const isPath = typeof image === 'string'
  const MAX_SIZE = 5 * 1024 * 1024
  let re: (value: string) => void
  let rj: (reason?: any) => void
  const promise = new Promise<string>((resolve, reject) => {
    re = resolve
    rj = reject
  })

  if (currentUploader === 'none') {
    rj!('No image uploader provided.')
  }

  const uploadByGithub = (content: string, filename: string): void => {
    const octokit = new Octokit({
      auth
    })
    const path =
      dayjs().format('YYYY/MM') +
      `/${dayjs().format('DD-HH-mm-ss')}-${filename}`
    const message = `Upload by MarkText at ${dayjs().format(
      'YYYY-MM-DD HH:mm:ss'
    )}`
    const payload: Record<string, any> = {
      owner,
      repo,
      path,
      branch,
      message,
      content
    }
    if (!branch) {
      delete payload.branch
    }
    octokit.repos
      .createOrUpdateFileContents(payload as any)
      .then((result: any) => {
        re!(result.data.content.download_url)
      })
      .catch((_: any) => {
        rj!('Upload failed, the image will be copied to the image folder')
      })
  }

  const uploadByCommand = async (uploader: string, filepath: string | ArrayBuffer): Promise<void> => {
    let isPath = true
    if (typeof filepath !== 'string') {
      isPath = false
      const data = new Uint8Array(filepath)
      filepath = path.join(await tmpdir(), String(+new Date()))
      await fse.writeFile(filepath as string, data as any)
    }
    if (uploader === 'picgo') {
      cp.exec(`picgo u "${filepath}"`, async (err: Error | null, data?: string) => {
        if (!isPath) {
          await fse.unlink(filepath as string)
        }
        if (err) {
          return rj!(err)
        }
        const parts = (data as string).split('[PicGo SUCCESS]:')
        if (parts.length === 2) {
          re!(parts[1].trim())
        } else {
          rj!('PicGo upload error')
        }
      })
    } else {
      cp.execFile(cliScript, [filepath as string], async (err: Error | null, data?: string) => {
        if (!isPath) {
          await fse.unlink(filepath as string)
        }
        if (err) {
          return rj!(err)
        }
        re!((data as string).trim())
      })
    }
  }

  const notification = (): void => {
    rj!(
      'Cannot upload more than 5M image, the image will be copied to the image folder'
    )
  }

  if (isPath) {
    const dirname = path.dirname(pathname)
    const imagePath = path.resolve(dirname, image as string)
    const isImage = isImageFile(imagePath)
    if (isImage) {
      const { size } = await fse.stat(imagePath)
      if (size > MAX_SIZE) {
        notification()
      } else {
        switch (currentUploader) {
          case 'cliScript':
          case 'picgo':
            uploadByCommand(currentUploader, imagePath)
            break
          case 'github': {
            const imageFile = await fse.readFile(imagePath)
            const base64 = Buffer.from(imageFile).toString('base64')
            uploadByGithub(base64, path.basename(imagePath))
            break
          }
        }
      }
    } else {
      re!(image as string)
    }
  } else {
    const file = image as File
    const { size } = file
    if (size > MAX_SIZE) {
      notification()
    } else {
      const reader = new FileReader()
      reader.onload = async () => {
        switch (currentUploader) {
          case 'picgo':
          case 'cliScript':
            uploadByCommand(currentUploader, reader.result as ArrayBuffer)
            break
          default:
            uploadByGithub(reader.result as string, file.name)
        }
      }

      const readerFunction: 'readAsArrayBuffer' | 'readAsDataURL' =
        currentUploader !== 'github' ? 'readAsArrayBuffer' : 'readAsDataURL'
      reader[readerFunction](file)
    }
  }
  return promise
}

export const isFileExecutableSync = (filepath: string): boolean => {
  try {
    const stat = statSync(filepath)
    return (
      stat.isFile() &&
      (stat.mode &
        (constants.S_IXUSR | constants.S_IXGRP | constants.S_IXOTH)) !==
        0
    )
  } catch (err) {
    // err ignored
    return false
  }
}
