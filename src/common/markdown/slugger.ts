import { downcode } from './urlify'

/**
 * Slugger generates heading ids and deduplicates collisions.
 */
class Slugger {
  seen: Record<string, number>
  downcodeUnicode: boolean

  constructor() {
    this.seen = {}
    this.downcodeUnicode = true
  }

  slug(value: string): string {
    const input = this.downcodeUnicode ? downcode(value) : value
    let slug = input
      .toLowerCase()
      .trim()
      // remove html tags
      .replace(/<[!/a-z].*?>/gi, '')
      // remove unwanted chars
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-')

    if (Object.prototype.hasOwnProperty.call(this.seen, slug)) {
      const originalSlug = slug
      do {
        this.seen[originalSlug]++
        slug = `${originalSlug}-${this.seen[originalSlug]}`
      } while (Object.prototype.hasOwnProperty.call(this.seen, slug))
    }
    this.seen[slug] = 0

    return slug
  }
}

export default Slugger
