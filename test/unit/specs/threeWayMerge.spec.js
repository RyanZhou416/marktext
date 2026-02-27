import { describe, expect, it } from 'vitest'
import { mergeThreeWayText } from '../../../src/renderer/services/merge/threeWayMerge'

describe('mergeThreeWayText', () => {
  it('uses theirs when ours equals base', () => {
    const result = mergeThreeWayText('hello', 'hello', 'hello world')
    expect(result.hasConflict).toBe(false)
    expect(result.merged).toBe('hello world')
  })

  it('uses ours when theirs equals base', () => {
    const result = mergeThreeWayText('hello', 'hello world', 'hello')
    expect(result.hasConflict).toBe(false)
    expect(result.merged).toBe('hello world')
  })

  it('auto-merges non-overlapping edits', () => {
    const base = 'title\nbody\nfooter'
    const ours = 'title changed\nbody\nfooter'
    const theirs = 'title\nbody\nfooter updated'
    const result = mergeThreeWayText(base, ours, theirs)
    expect(result.hasConflict).toBe(false)
    expect(result.merged).toContain('title changed')
    expect(result.merged).toContain('footer updated')
  })

  it('returns conflict for overlapping edits', () => {
    const base = 'abc'
    const ours = 'axc'
    const theirs = 'ayc'
    const result = mergeThreeWayText(base, ours, theirs)
    expect(result.hasConflict).toBe(true)
    expect(result.conflicts.length).toBeGreaterThan(0)
  })
})
