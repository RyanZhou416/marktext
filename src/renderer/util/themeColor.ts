import darkTheme from '../assets/themes/dark.theme.css?inline'
import everforestDarkTheme from '../assets/themes/everforest-dark.theme.css?inline'
import everforestLightTheme from '../assets/themes/everforest-light.theme.css?inline'
import graphiteTheme from '../assets/themes/graphite.theme.css?inline'
import materialDarkTheme from '../assets/themes/material-dark.theme.css?inline'
import oneDarkTheme from '../assets/themes/one-dark.theme.css?inline'
import ulyssesTheme from '../assets/themes/ulysses.theme.css?inline'

import darkPrismTheme from '../assets/themes/prismjs/dark.theme.css?inline'
import oneDarkPrismTheme from '../assets/themes/prismjs/one-dark.theme.css?inline'

export const dark = (): string => {
  return darkTheme + '\n' + darkPrismTheme
}

export const graphite = (): string => {
  return graphiteTheme
}

export const everforestLight = (): string => {
  return everforestLightTheme
}

export const everforestDark = (): string => {
  return everforestDarkTheme + '\n' + oneDarkPrismTheme
}

export const materialDark = (): string => {
  return materialDarkTheme + '\n' + darkPrismTheme
}

export const oneDark = (): string => {
  return oneDarkTheme + '\n' + oneDarkPrismTheme
}

export const ulysses = (): string => {
  return ulyssesTheme
}
