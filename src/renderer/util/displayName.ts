export const UNTITLED_INTERNAL_TOKEN = '__UNTITLED__'

export const buildInternalUntitledFilename = (index: number): string => {
  return `${UNTITLED_INTERNAL_TOKEN}-${index}`
}

export const parseUntitledIndex = (filename: string | undefined): number | null => {
  if (!filename) return null

  // New language-neutral internal placeholder.
  const internalMatch = new RegExp(`^${UNTITLED_INTERNAL_TOKEN}-(\\d+)$`).exec(filename)
  if (internalMatch) return Number(internalMatch[1])

  // Legacy internal placeholder for backward compatibility.
  const legacyMatch = /^Untitled-(\d+)$/.exec(filename)
  if (legacyMatch) return Number(legacyMatch[1])

  return null
}

export const localizeUntitledFilename = (
  filename: string | undefined,
  pathname: string | undefined,
  t: (key: string) => string
): string => {
  if (!filename) return ''
  if (pathname) return filename

  const untitledIndex = parseUntitledIndex(filename)
  if (untitledIndex !== null) {
    return `${t('dialog.untitled')}-${untitledIndex}`
  }

  if (filename === UNTITLED_INTERNAL_TOKEN || filename === 'Untitled') {
    return t('dialog.untitled')
  }

  return filename
}
