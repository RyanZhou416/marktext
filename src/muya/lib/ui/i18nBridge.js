/**
 * i18n bridge for Muya UI components.
 * The translation function is injected from the Vue app side.
 */
let _translate = key => key

export const setMuyaTranslator = t => {
  _translate = t
}

export const t = key => _translate(key)
