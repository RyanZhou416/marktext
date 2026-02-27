import { beforeEach, describe, expect, it } from 'vitest'
import { getImageInfo } from '../../../src/common/markdown/getImageInfo'

describe('image asset protocol', () => {
  beforeEach(() => {
    delete window.__MT_ASSET_BASE_DIR
  })

  it('resolves marktext-asset protocol by configured asset base dir', () => {
    window.__MT_ASSET_BASE_DIR = '/asset-root'
    const info = getImageInfo('marktext-asset://doc-a/pic.png', '/ignored')

    expect(info.isUnknownType).toBe(false)
    expect(info.src).toBe('file:///asset-root/doc-a/pic.png')
  })

  it('returns empty src when marktext-asset has no base dir', () => {
    const info = getImageInfo('marktext-asset://doc-a/pic.png', '')
    expect(info.isUnknownType).toBe(false)
    expect(info.src).toBe('')
  })
})
