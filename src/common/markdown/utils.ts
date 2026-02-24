/**
 * Shared markdown utilities - used by both Muya and Milkdown adapters.
 * Extracted from muya for engine independence.
 */

export const escapeHTML = (str: string): string =>
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

export const unescapeHTML = (str: string): string =>
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

export interface WordCountResult {
  word: number
  paragraph: number
  character: number
  all: number
}

export const wordCount = (markdown: string): WordCountResult => {
  const paragraph = markdown.split(/\n{2,}/).filter(line => line).length
  let word = 0
  let character = 0
  const all = markdown.length

  const removedChinese = markdown.replace(/[\u4e00-\u9fa5]/g, '')
  const tokens = removedChinese.split(/[\s\n]+/).filter(t => t)
  const chineseWordLength = markdown.length - removedChinese.length
  word += chineseWordLength + tokens.length
  character += tokens.reduce((acc, t) => acc + t.length, 0) + chineseWordLength

  return { word, paragraph, character, all }
}
