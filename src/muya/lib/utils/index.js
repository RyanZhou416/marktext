import runSanitize from './dompurify'
import { URL_REG, DATA_URL_REG, IMAGE_EXT_REG } from '../config'
export { getUniqueId, getLongUniqueId } from './random'

const TIMEOUT = 1500

/**
 * Convert a local file path to a URL that Tauri's webview can load.
 * In Tauri v2, `file://` protocol is blocked — use the `asset` protocol instead.
 * Falls back to `file://` for non-Tauri environments (Electron / browser).
 */
export const toLocalFileUrl = filePath => {
  const normalizedPath = typeof filePath === 'string' ? filePath.replace(/\\/g, '/') : filePath
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    const isTauriDevWithVite = /^https?:\/\/localhost:\d+$/i.test(window.location.origin)
    if (isTauriDevWithVite) {
      // In Tauri dev (external Vite dev server), browser can load local files via /@fs/.
      // Examples:
      // - Windows: /@fs/C:/path/to/file.png
      // - Unix:    /@fs//Users/name/file.png
      return `/@fs/${encodeURI(normalizedPath)}`
    }

    const convertFileSrc =
      window.__MT_CONVERT_FILE_SRC__ || window.__TAURI_INTERNALS__?.convertFileSrc
    if (typeof convertFileSrc === 'function') {
      try {
        return convertFileSrc(normalizedPath)
      } catch {
        // fallback to manual strategy below
      }
    }
    // In packaged app, use Tauri asset protocol fallback.
    const encoded = encodeURIComponent(normalizedPath)
    return `http://asset.localhost/${encoded}`
  }
  return 'file://' + normalizedPath
}

const HTML_TAG_REPLACEMENTS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

export const isMetaKey = ({ key }) =>
  key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta'

export const noop = () => {}

export const identity = i => i

export const isOdd = number => Math.abs(number) % 2 === 1

export const isEven = number => Math.abs(number) % 2 === 0

export const isLengthEven = (str = '') => str.length % 2 === 0

export const snakeToCamel = name => name.replace(/_([a-z])/g, (p0, p1) => p1.toUpperCase())

export const camelToSnake = name => name.replace(/([A-Z])/g, (_, p) => `-${p.toLowerCase()}`)

/**
 *  Are two arrays have intersection
 */
export const conflict = (arr1, arr2) => {
  return !(arr1[1] < arr2[0] || arr2[1] < arr1[0])
}

export const union = ({ start: tStart, end: tEnd }, { start: lStart, end: lEnd, active }) => {
  if (!(tEnd <= lStart || lEnd <= tStart)) {
    if (lStart < tStart) {
      return {
        start: tStart,
        end: tEnd < lEnd ? tEnd : lEnd,
        active
      }
    } else {
      return {
        start: lStart,
        end: tEnd < lEnd ? tEnd : lEnd,
        active
      }
    }
  }
  return null
}

// https://github.com/jashkenas/underscore
export const throttle = (func, wait = 50) => {
  let context
  let args
  let result
  let timeout = null
  let previous = 0
  const later = () => {
    previous = Date.now()
    timeout = null
    result = func.apply(context, args)
    if (!timeout) {
      context = args = null
    }
  }

  return function () {
    const now = Date.now()
    const remaining = wait - (now - previous)

    context = this
    args = arguments
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      result = func.apply(context, args)
      if (!timeout) {
        context = args = null
      }
    } else if (!timeout) {
      timeout = setTimeout(later, remaining)
    }
    return result
  }
}
// simple implementation...
export const debounce = (func, wait = 50) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export const deepCopyArray = array => {
  const result = []
  const len = array.length
  let i
  for (i = 0; i < len; i++) {
    if (typeof array[i] === 'object' && array[i] !== null) {
      if (Array.isArray(array[i])) {
        result.push(deepCopyArray(array[i]))
      } else {
        result.push(deepCopy(array[i]))
      }
    } else {
      result.push(array[i])
    }
  }
  return result
}

// TODO: @jocs rewrite deepCopy
export const deepCopy = object => {
  const obj = {}
  Object.keys(object).forEach(key => {
    if (typeof object[key] === 'object' && object[key] !== null) {
      if (Array.isArray(object[key])) {
        obj[key] = deepCopyArray(object[key])
      } else {
        obj[key] = deepCopy(object[key])
      }
    } else {
      obj[key] = object[key]
    }
  })
  return obj
}

const getImageMimeByPath = filePath => {
  const lower = String(filePath || '').toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'application/octet-stream'
}

const parseAssetHostToLocalPath = url => {
  const match = /^https?:\/\/asset\.localhost\/(.+)$/i.exec(url || '')
  if (!match || !match[1]) return ''
  try {
    const decoded = decodeURIComponent(match[1])
    return /^[a-zA-Z]:\//.test(decoded) ? decoded.replace(/\//g, '\\') : decoded
  } catch {
    return match[1]
  }
}

const getPathCandidates = rawPath => {
  const p = String(rawPath || '')
  const list = [
    p,
    p.replace(/\//g, '\\'),
    p.replace(/\\/g, '/'),
    p.replace(/^\/([a-zA-Z]:[\\/])/, '$1'),
    p.replace(/^\\\\\?\\/, '')
  ]
  return Array.from(new Set(list.filter(Boolean)))
}

const loadAssetHostViaBinaryFallback = async originalUrl => {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return ''
  const localPath = parseAssetHostToLocalPath(originalUrl)
  if (!localPath) return ''
  const invoke = window.__TAURI_INTERNALS__?.invoke
  if (typeof invoke !== 'function') return ''

  for (const candidate of getPathCandidates(localPath)) {
    try {
      const exists = await invoke('exists', { path: candidate })
      if (!exists) continue
      const bytes = await invoke('read_file_binary', { path: candidate })
      const typed = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])
      if (!typed.length) continue
      const blob = new Blob([typed], { type: getImageMimeByPath(candidate) })
      return URL.createObjectURL(blob)
    } catch {
      // try next candidate
    }
  }
  return ''
}

export const loadImage = async (url, detectContentType = false) => {
  const preferredUrl = url

  if (detectContentType) {
    const isImage = await checkImageContentType(preferredUrl)
    if (!isImage) throw new Error('not an image')
  }
  return new Promise((resolve, reject) => {
    const image = new Image()
    const candidates = [preferredUrl]
    if (/^https?:\/\/asset\.localhost\//.test(url) && preferredUrl === url) {
      const prefix = url.startsWith('https://')
        ? 'https://asset.localhost/'
        : 'http://asset.localhost/'
      const raw = url.slice(prefix.length)
      let decoded = raw
      try {
        decoded = decodeURIComponent(raw)
      } catch {
        // Keep raw path when decode fails.
      }
      const normalizedDecoded = decoded.replace(/\\/g, '/')
      candidates.push(`${prefix}${encodeURIComponent(decoded)}`)
      candidates.push(`${prefix}${encodeURI(normalizedDecoded)}`)
      candidates.push(
        `${prefix}${raw.replace(/%2F/gi, '/').replace(/%5C/gi, '/').replace(/\\/g, '/')}`
      )
    }

    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)))
    let index = 0
    const tryNext = async () => {
      if (index >= uniqueCandidates.length) {
        if (/^https?:\/\/asset\.localhost\//i.test(url || '') && preferredUrl === url) {
          const fallback = await loadAssetHostViaBinaryFallback(url)
          if (fallback) {
            image.src = fallback
            return
          }
        }
        reject(new Error('load image failed'))
        return
      }
      image.src = uniqueCandidates[index++]
    }

    image.onload = () => {
      resolve({
        url: image.src,
        width: image.width,
        height: image.height
      })
    }
    image.onerror = () => {
      void tryNext()
    }
    void tryNext()
  })
}

export const isOnline = () => {
  return navigator.onLine === true
}

export const getPageTitle = url => {
  // No need to request the title when it's not url.
  if (!url.startsWith('http')) {
    return ''
  }
  // No need to request the title when off line.
  if (!isOnline()) {
    return ''
  }

  const req = new XMLHttpRequest()
  let settle
  const promise = new Promise((resolve, _reject) => {
    settle = resolve
  })
  const handler = () => {
    if (req.readyState === XMLHttpRequest.DONE) {
      if (req.status === 200) {
        const contentType = req.getResponseHeader('Content-Type')
        if (/text\/html/.test(contentType)) {
          const { response } = req
          if (typeof response === 'string') {
            const match = response.match(/<title>(.*)<\/title>/)
            return match && match[1] ? settle(match[1]) : settle('')
          }
          return settle('')
        }
        return settle('')
      } else {
        return settle('')
      }
    }
  }
  const handleError = _e => {
    settle('')
  }
  req.open('GET', url)
  req.onreadystatechange = handler
  req.onerror = handleError
  req.send()

  // Resolve empty string when `TIMEOUT` passed.
  const timer = new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve('')
    }, TIMEOUT)
  })

  return Promise.race([promise, timer])
}

export const checkImageContentType = url => {
  const req = new XMLHttpRequest()
  let settle
  const promise = new Promise((resolve, _reject) => {
    settle = resolve
  })
  const handler = () => {
    if (req.readyState === XMLHttpRequest.DONE) {
      if (req.status === 200) {
        const contentType = req.getResponseHeader('Content-Type')
        if (/^image\/(?:jpeg|png|gif|svg\+xml|webp)$/.test(contentType)) {
          settle(true)
        } else {
          settle(false)
        }
      } else if (req.status === 405) {
        // status 405 means method not allowed, and just return true.(Solve issue#1297)
        settle(true)
      } else {
        settle(false)
      }
    }
  }
  const handleError = () => {
    settle(false)
  }
  req.open('HEAD', url)
  req.onreadystatechange = handler
  req.onerror = handleError
  req.send()

  return promise
}

/**
 * Return image information and correct the relative image path if needed.
 *
 * @param {string} src Image url
 * @param {string} baseUrl Base path; used on desktop to fix the relative image path.
 */
export const getImageInfo = (src, baseUrl = window.DIRNAME) => {
  if (/^marktext-asset:\/\//.test(src)) {
    const relativePart = src.replace(/^marktext-asset:\/\//, '')
    const assetBaseDir =
      (typeof window !== 'undefined' && window.__MT_ASSET_BASE_DIR) || baseUrl || ''
    if (relativePart && assetBaseDir) {
      const pathModule =
        typeof window !== 'undefined' && window.electronAPI && window.electronAPI.path
          ? window.electronAPI.path
          : { resolve: (...args) => args.filter(Boolean).join('/') }
      const resolvedPath = pathModule.resolve(assetBaseDir, relativePart).replace(/\\/g, '/')
      return {
        isUnknownType: false,
        src: toLocalFileUrl(resolvedPath)
      }
    }
    return {
      isUnknownType: false,
      src: ''
    }
  }

  const imageExtension = IMAGE_EXT_REG.test(src)
  const isAssetUrl = /^https:\/\/asset\.localhost\//.test(src) || /^asset:\/\/localhost\//.test(src)
  const isUrl = URL_REG.test(src) || (imageExtension && (/^file:\/\/.+/.test(src) || isAssetUrl))

  // Treat an URL with valid extension as image.
  if (imageExtension) {
    // NOTE: Check both "C:\" and "C:/" because we're using "file:///C:/".
    const isAbsoluteLocal = /^(?:\/|\\\\|[a-zA-Z]:\\|[a-zA-Z]:\/).+/.test(src)

    if (isUrl || (!isAbsoluteLocal && !baseUrl)) {
      if (!isUrl && !baseUrl) {
        console.warn('"baseUrl" is not defined!')
      }

      return {
        isUnknownType: false,
        src
      }
    } else {
      // Correct relative path on desktop. If we resolve a absolute path "path.resolve" doesn't do anything.
      // Use electronAPI.path (provided by Tauri bridge or Electron preload)
      const pathModule =
        typeof window !== 'undefined' && window.electronAPI && window.electronAPI.path
          ? window.electronAPI.path
          : { resolve: (...args) => args.filter(Boolean).join('/') }
      const resolvedPath = pathModule.resolve(baseUrl, src).replace(/\\/g, '/')
      return {
        isUnknownType: false,
        src: toLocalFileUrl(resolvedPath)
      }
    }
  } else if (isUrl && !imageExtension) {
    // Assume it's a valid image and make a http request later
    return {
      isUnknownType: true,
      src
    }
  }

  // Data url
  if (DATA_URL_REG.test(src)) {
    return {
      isUnknownType: false,
      src
    }
  }

  // Url type is unknown
  return {
    isUnknownType: false,
    src: ''
  }
}

export const escapeHTML = str =>
  str.replace(
    /[&<>'"]/g,
    tag =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[tag] || tag
  )

export const unescapeHTML = str =>
  str.replace(
    /(?:&amp;|&lt;|&gt;|&quot;|&#39;)/g,
    tag =>
      ({
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&#39;': "'",
        '&quot;': '"'
      })[tag] || tag
  )

export const escapeInBlockHtml = html => {
  return html.replace(/(<(style|script|title)[^<>]*>)([\s\S]*?)(<\/\2>)/g, (m, p1, p2, p3, p4) => {
    return `${escapeHTML(p1)}${p3}${escapeHTML(p4)}`
  })
}

export const escapeHtmlTags = html => {
  return html.replace(/[&<>"']/g, x => {
    return HTML_TAG_REPLACEMENTS[x]
  })
}

export const wordCount = markdown => {
  const paragraph = markdown.split(/\n{2,}/).filter(line => line).length
  let word = 0
  let character = 0
  let all = 0

  const removedChinese = markdown.replace(/[\u4e00-\u9fa5]/g, '')
  const tokens = removedChinese.split(/[\s\n]+/).filter(t => t)
  const chineseWordLength = markdown.length - removedChinese.length
  word += chineseWordLength + tokens.length
  character += tokens.reduce((acc, t) => acc + t.length, 0) + chineseWordLength
  all += markdown.length

  return { word, paragraph, character, all }
}

// mixins
export const mixins = (constructor, ...object) => {
  return Object.assign(constructor.prototype, ...object)
}

export const sanitize = (html, purifyOptions, disableHtml) => {
  if (disableHtml) {
    return runSanitize(escapeHtmlTags(html), purifyOptions)
  } else {
    return runSanitize(escapeInBlockHtml(html), purifyOptions)
  }
}

export const getParagraphReference = (ele, id) => {
  const { x, y, left, top, bottom, height } = ele.getBoundingClientRect()
  return {
    getBoundingClientRect() {
      return { x, y, left, top, bottom, height, width: 0, right: left }
    },
    clientWidth: 0,
    clientHeight: height,
    id
  }
}

export const verticalPositionInRect = (event, rect) => {
  const { clientY } = event
  const { top, height } = rect
  return clientY - top > height / 2 ? 'down' : 'up'
}

export const collectFootnotes = blocks => {
  const map = new Map()
  for (const block of blocks) {
    if (block.type === 'figure' && block.functionType === 'footnote') {
      const identifier = block.children[0].text
      map.set(identifier, block)
    }
  }

  return map
}

export const getDefer = () => {
  const defer = {}
  const promise = new Promise((resolve, reject) => {
    defer.resolve = resolve
    defer.reject = reject
  })
  defer.promise = promise

  return defer
}

/**
 * Deep clone the given object.
 *
 * @param {*} obj Object to clone
 */
export const deepClone = obj => {
  return JSON.parse(JSON.stringify(obj))
}
