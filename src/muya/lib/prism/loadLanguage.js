import components from 'prismjs/components.js'
import getLoader from 'prismjs/dependencies'
import { getDefer } from '../utils'
/**
 * The set of all languages which have been loaded using the below function.
 *
 * @type {Set<string>}
 */
export const loadedLanguages = new Set(['markup', 'css', 'clike', 'javascript'])

const { languages } = components

// Look for the origin languge by alias
export const transformAliasToOrigin = langs => {
  const result = []
  for (const lang of langs) {
    if (languages[lang]) {
      result.push(lang)
    } else {
      const language = Object.keys(languages).find(name => {
        const l = languages[name]
        if (l.alias) {
          return l.alias === lang || Array.isArray(l.alias) && l.alias.includes(lang)
        }
        return false
      })

      if (language) {
        result.push(language)
      } else {
        // The lang is not exist, the will handle in `initLoadLanguage`
        result.push(lang)
      }
    }
  }

  return result
}

// Glob all prism components from node_modules
// Vite's import.meta.glob works with absolute paths (relative to project root) if they start with /
// However, globbing node_modules is generally discouraged but necessary here for dynamic loading
const prismComponents = import.meta.glob('/node_modules/prismjs/components/prism-*.js')
// Also try relative path fallback if the above fails in some environments
const prismComponentsRelative = import.meta.glob('../../../../node_modules/prismjs/components/prism-*.js')

function initLoadLanguage (Prism) {
  return async function loadLanguages (langs) {
    // If no argument is passed, load all components
    if (!langs) {
      langs = Object.keys(languages).filter(lang => lang !== 'meta')
    }

    if (langs && !langs.length) {
      return Promise.reject(new Error('The first parameter should be a list of load languages or single language.'))
    }

    if (!Array.isArray(langs)) {
      langs = [langs]
    }

    const promises = []
    // The user might have loaded languages via some other way or used `prism.js` which already includes some
    // We don't need to validate the ids because `getLoader` will ignore invalid ones
    const loaded = [...loadedLanguages, ...Object.keys(Prism.languages)]

    getLoader(components, langs, loaded).load(async lang => {
      const defer = getDefer()
      promises.push(defer.promise)
      if (!(lang in components.languages)) {
        defer.resolve({
          lang,
          status: 'noexist'
        })
      } else if (loadedLanguages.has(lang)) {
        defer.resolve({
          lang,
          status: 'cached'
        })
      } else {
        delete Prism.languages[lang]
        try {
          // Try to load using the glob map
          // Note: prismjs files usually end with .js but sometimes min.js, here we assume dev/source is .js
          const key = `/node_modules/prismjs/components/prism-${lang}.js`
          const relativeKey = `../../../../node_modules/prismjs/components/prism-${lang}.js`

          let loader = prismComponents[key] || prismComponentsRelative[relativeKey]

          if (!loader) {
             // Fallback: try to find key that ends with prism-{lang}.js
            const foundKey = Object.keys(prismComponents).find(k => k.endsWith(`/prism-${lang}.js`)) ||
                              Object.keys(prismComponentsRelative).find(k => k.endsWith(`/prism-${lang}.js`))
            if (foundKey) {
              loader = prismComponents[foundKey] || prismComponentsRelative[foundKey]
            }
          }

          if (loader) {
            await loader()
            defer.resolve({
              lang,
              status: 'loaded'
            })
            loadedLanguages.add(lang)
          } else {
            console.error(`Prism language component not found: ${lang}`)
            defer.resolve({
              lang,
              status: 'error'
            })
          }
        } catch (err) {
          console.error(`Failed to load Prism language: ${lang}`, err)
          defer.resolve({
            lang,
            status: 'error'
          })
        }
      }
    })

    return Promise.all(promises)
  }
}

export default initLoadLanguage
