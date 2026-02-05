import chardet from 'chardet'

interface Encoding {
  encoding: string
  isBom: boolean
}

// chardet 返回的编码名称到 iconv-lite 兼容名称的映射
const CHARDET_ICONV_ENCODINGS: Record<string, string> = {
  Big5: 'big5',
  'EUC-KR': 'euckr',
  GB18030: 'gb18030',
  GB2312: 'gb2312',
  Shift_JIS: 'shiftjis',
  'UTF-8': 'utf8',
  'UTF-16 BE': 'utf16be',
  'UTF-16 LE': 'utf16le',
  'UTF-32 BE': 'utf32be',
  'UTF-32 LE': 'utf32le',
  'ISO-8859-1': 'iso88591',
  'ISO-8859-2': 'iso88592',
  'ISO-8859-5': 'iso88595',
  'ISO-8859-6': 'iso88596',
  'ISO-8859-7': 'iso88597',
  'ISO-8859-8': 'iso88598',
  'ISO-8859-9': 'iso88599',
  'windows-1250': 'win1250',
  'windows-1251': 'win1251',
  'windows-1252': 'win1252',
  'windows-1253': 'win1253',
  'windows-1254': 'win1254',
  'windows-1255': 'win1255',
  'windows-1256': 'win1256',
  'KOI8-R': 'koi8r',
  ascii: 'utf8',
  ASCII: 'utf8'
}

// Byte Order Mark's to detect endianness and encoding.
const BOM_ENCODINGS: Record<string, number[]> = {
  utf8: [0xef, 0xbb, 0xbf],
  utf16be: [0xfe, 0xff],
  utf16le: [0xff, 0xfe]
}

const checkSequence = (buffer: Buffer, sequence: number[]): boolean => {
  if (buffer.length < sequence.length) {
    return false
  }
  return sequence.every((v, i) => v === buffer[i])
}

/**
 * Guess the encoding from the buffer.
 */
export const guessEncoding = (buffer: Buffer, autoGuessEncoding: boolean): Encoding => {
  let encoding = 'utf8'

  // Detect UTF8- and UTF16-BOM encodings.
  for (const [key, value] of Object.entries(BOM_ENCODINGS)) {
    if (checkSequence(buffer, value)) {
      return { encoding: key, isBom: true }
    }
  }

  // Auto guess encoding, otherwise use UTF8.
  if (autoGuessEncoding) {
    const detected = chardet.detect(buffer)
    if (detected) {
      if (CHARDET_ICONV_ENCODINGS[detected]) {
        encoding = CHARDET_ICONV_ENCODINGS[detected]
      } else {
        encoding = detected.toLowerCase().replace(/[-_\s]/g, '')
      }
    }
  }
  return { encoding, isBom: false }
}
