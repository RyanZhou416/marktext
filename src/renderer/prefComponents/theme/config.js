export const themes = [
  {
    name: 'light'
  },
  {
    name: 'dark'
  },
  {
    name: 'graphite'
  },
  {
    name: 'material-dark'
  },
  {
    name: 'ulysses'
  },
  {
    name: 'one-dark'
  },
  {
    name: 'everforest-light'
  },
  {
    name: 'everforest-dark'
  }
]

export const autoSwitchThemeOptions = t => [
  {
    label: t('settings.theme.adjustAtStartup'), // Always
    value: 0
  },
  /* {
  label: 'Only at runtime',
  value: 1
}, */ {
    label: t('settings.theme.never'),
    value: 2
  }
]
