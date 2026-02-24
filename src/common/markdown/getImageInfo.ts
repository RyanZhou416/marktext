/**
 * Get image info and resolve relative paths - shared for print/export.
 * Extracted from muya for engine independence.
 */

const IMAGE_EXT_REG = /\.(?:jpeg|jpg|png|gif|svg|webp)(?=\?|$)/i
const URL_REG =
  /^http(s)?:\/\/([a-z0-9\-._~]+\.[a-z]{2,}|[0-9.]+|localhost|\[[a-f0-9.:]+\])(:[0-9]{1,5})?\/[\S]+/i
const DATA_URL_REG = /^data:image\/[\w+-]+(;[\w-]+=[\w-]+|;base64)*,[a-zA-Z0-9+/]+={0,2}$/

export const toLocalFileUrl = (filePath: string): string => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const encoded = encodeURIComponent(filePath)
    return navigator.userAgent.includes('Windows')
      ? `https://asset.localhost/${encoded}`
      : `asset://localhost/${encoded}`
  }
  return 'file://' + filePath
}

export interface ImageInfo {
  isUnknownType: boolean
  src: string
}

export const getImageInfo = (src: string, baseUrl: string = (window as any).DIRNAME): ImageInfo => {
  const imageExtension = IMAGE_EXT_REG.test(src)
  const isAssetUrl = /^https:\/\/asset\.localhost\//.test(src) || /^asset:\/\/localhost\//.test(src)
  const isUrl = URL_REG.test(src) || (imageExtension && (/^file:\/\/.+/.test(src) || isAssetUrl))

  if (imageExtension) {
    const isAbsoluteLocal = /^(?:\/|\\\\|[a-zA-Z]:\\|[a-zA-Z]:\/).+/.test(src)

    if (isUrl || (!isAbsoluteLocal && !baseUrl)) {
      return { isUnknownType: false, src }
    }
    const pathModule =
      typeof window !== 'undefined' &&
      (window as any).electronAPI &&
      (window as any).electronAPI.path
        ? (window as any).electronAPI.path
        : { resolve: (...args: string[]) => args.filter(Boolean).join('/') }
    const resolvedPath = pathModule.resolve(baseUrl, src)
    return { isUnknownType: false, src: toLocalFileUrl(resolvedPath) }
  }

  if (isUrl && !imageExtension) {
    return { isUnknownType: true, src }
  }

  if (DATA_URL_REG.test(src)) {
    return { isUnknownType: false, src }
  }

  return { isUnknownType: false, src: '' }
}
