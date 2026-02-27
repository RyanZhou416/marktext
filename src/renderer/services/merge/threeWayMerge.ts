export interface MergeConflict {
  id: string
  ours: string
  theirs: string
}

export interface MergeResult {
  merged: string
  hasConflict: boolean
  conflicts: MergeConflict[]
}

interface TextChange {
  start: number
  end: number
  replacement: string
}

const applyChange = (source: string, change: TextChange): string => {
  return source.slice(0, change.start) + change.replacement + source.slice(change.end)
}

const getSingleChange = (base: string, target: string): TextChange | null => {
  if (base === target) return null

  let prefix = 0
  const minLen = Math.min(base.length, target.length)
  while (prefix < minLen && base[prefix] === target[prefix]) {
    prefix++
  }

  let baseSuffix = base.length
  let targetSuffix = target.length
  while (
    baseSuffix > prefix &&
    targetSuffix > prefix &&
    base[baseSuffix - 1] === target[targetSuffix - 1]
  ) {
    baseSuffix--
    targetSuffix--
  }

  return {
    start: prefix,
    end: baseSuffix,
    replacement: target.slice(prefix, targetSuffix)
  }
}

export const mergeThreeWayText = (base: string, ours: string, theirs: string): MergeResult => {
  if (ours === theirs) {
    return { merged: ours, hasConflict: false, conflicts: [] }
  }
  if (ours === base) {
    return { merged: theirs, hasConflict: false, conflicts: [] }
  }
  if (theirs === base) {
    return { merged: ours, hasConflict: false, conflicts: [] }
  }

  const oursChange = getSingleChange(base, ours)
  const theirsChange = getSingleChange(base, theirs)
  if (!oursChange || !theirsChange) {
    return {
      merged: ours,
      hasConflict: true,
      conflicts: [
        {
          id: 'conflict-1',
          ours,
          theirs
        }
      ]
    }
  }

  if (oursChange.end <= theirsChange.start) {
    const withOurs = applyChange(base, oursChange)
    const shift = oursChange.replacement.length - (oursChange.end - oursChange.start)
    const shiftedTheirs: TextChange = {
      start: theirsChange.start + shift,
      end: theirsChange.end + shift,
      replacement: theirsChange.replacement
    }
    return {
      merged: applyChange(withOurs, shiftedTheirs),
      hasConflict: false,
      conflicts: []
    }
  }

  if (theirsChange.end <= oursChange.start) {
    const withTheirs = applyChange(base, theirsChange)
    const shift = theirsChange.replacement.length - (theirsChange.end - theirsChange.start)
    const shiftedOurs: TextChange = {
      start: oursChange.start + shift,
      end: oursChange.end + shift,
      replacement: oursChange.replacement
    }
    return {
      merged: applyChange(withTheirs, shiftedOurs),
      hasConflict: false,
      conflicts: []
    }
  }

  return {
    merged: ours,
    hasConflict: true,
    conflicts: [
      {
        id: 'conflict-1',
        ours: oursChange.replacement,
        theirs: theirsChange.replacement
      }
    ]
  }
}
