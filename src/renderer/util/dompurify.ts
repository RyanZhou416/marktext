import DOMPurify from 'dompurify'

const runSanitize = DOMPurify.sanitize.bind(DOMPurify)

interface DOMPurifyConfig {
  readonly FORBID_ATTR: readonly string[]
  readonly ALLOW_DATA_ATTR: boolean
  readonly ADD_ATTR?: readonly string[]
  readonly USE_PROFILES: {
    readonly html: boolean
    readonly svg: boolean
    readonly svgFilters: boolean
    readonly mathMl: boolean
  }
  readonly RETURN_TRUSTED_TYPE: boolean
  readonly ALLOWED_URI_REGEXP?: RegExp
}

export const PREVIEW_DOMPURIFY_CONFIG: DOMPurifyConfig = Object.freeze({
  FORBID_ATTR: ['style', 'contenteditable'],
  ALLOW_DATA_ATTR: false,
  USE_PROFILES: {
    html: true,
    svg: true,
    svgFilters: true,
    mathMl: false
  },
  RETURN_TRUSTED_TYPE: false
})

export const EXPORT_DOMPURIFY_CONFIG: DOMPurifyConfig = Object.freeze({
  FORBID_ATTR: ['contenteditable'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['data-align'],
  USE_PROFILES: {
    html: true,
    svg: true,
    svgFilters: true,
    mathMl: false
  },
  RETURN_TRUSTED_TYPE: false,
  // Allow "file" protocol to export images on Windows (#1997).
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
})

export const sanitize = (html: string, purifyOptions: any): string => {
  return runSanitize(html, purifyOptions)
}
