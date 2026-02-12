import { ENCODING_NAME_MAP } from 'common/encoding'

export const tabSizeOptions = [
  {
    label: '1',
    value: 1
  },
  {
    label: '2',
    value: 2
  },
  {
    label: '3',
    value: 3
  },
  {
    label: '4',
    value: 4
  }
]

export const endOfLineOptions = t => [
  {
    label: t('settings.editor.endOfLineDefault'),
    value: 'default'
  },
  {
    label: t('settings.editor.endOfLineCRLF'),
    value: 'crlf'
  },
  {
    label: t('settings.editor.endOfLineLF'),
    value: 'lf'
  }
]

export const trimTrailingNewlineOptions = t => [
  {
    label: t('settings.editor.trimAll'),
    value: 0
  },
  {
    label: t('settings.editor.ensureOne'),
    value: 1
  },
  {
    label: t('settings.editor.preserveOriginal'),
    value: 2
  },
  {
    label: t('settings.editor.doNothing'),
    value: 3
  }
]

export const textDirectionOptions = t => [
  {
    label: t('settings.editor.leftToRight'),
    value: 'ltr'
  },
  {
    label: t('settings.editor.rightToLeft'),
    value: 'rtl'
  }
]

let defaultEncodingOptions = null
export const getDefaultEncodingOptions = () => {
  if (defaultEncodingOptions) {
    return defaultEncodingOptions
  }

  defaultEncodingOptions = []
  for (const [value, label] of Object.entries(ENCODING_NAME_MAP)) {
    defaultEncodingOptions.push({ label, value })
  }
  return defaultEncodingOptions
}
