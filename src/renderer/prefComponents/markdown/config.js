export const bulletListMarkerOptions = [{
  label: '*',
  value: '*'
}, {
  label: '-',
  value: '-'
}, {
  label: '+',
  value: '+'
}]

export const orderListDelimiterOptions = [{
  label: '.',
  value: '.'
}, {
  label: ')',
  value: ')'
}]

export const preferHeadingStyleOptions = (t) => [{
  label: t('settings.markdown.atxHeading'),
  value: 'atx'
}, {
  label: t('settings.markdown.setextHeading'),
  value: 'setext'
}]

export const listIndentationOptions = (t) => [{
  label: t('settings.markdown.docfxStyle'),
  value: 'dfm'
}, {
  label: t('settings.markdown.trueTab'),
  value: 'tab'
}, {
  label: t('settings.markdown.singleSpace'),
  value: 1
}, {
  label: t('settings.markdown.twoSpaces'),
  value: 2
}, {
  label: t('settings.markdown.threeSpaces'),
  value: 3
}, {
  label: t('settings.markdown.fourSpaces'),
  value: 4
}]

export const frontmatterTypeOptions = [{
  label: 'YAML',
  value: '-'
}, {
  label: 'TOML',
  value: '+'
}, {
  label: 'JSON (;;;)',
  value: ';'
}, {
  label: 'JSON ({})',
  value: '{'
}]

export const sequenceThemeOptions = (t) => [{
  label: t('settings.markdown.handDrawn'),
  value: 'hand'
}, {
  label: t('settings.markdown.simple'),
  value: 'simple'
}]
