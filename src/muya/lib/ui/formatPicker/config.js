import { isOsx } from '../../config'
import strongIcon from '../../assets/pngicon/format_strong/2.png'
import emphasisIcon from '../../assets/pngicon/format_emphasis/2.png'
import underlineIcon from '../../assets/pngicon/format_underline/2.png'
import codeIcon from '../../assets/pngicon/code/2.png'
import imageIcon from '../../assets/pngicon/format_image/2.png'
import linkIcon from '../../assets/pngicon/format_link/2.png'
import strikeIcon from '../../assets/pngicon/format_strike/2.png'
import mathIcon from '../../assets/pngicon/format_math/2.png'
import highlightIcon from '../../assets/pngicon/highlight/2.png'
import clearIcon from '../../assets/pngicon/format_clear/2.png'

const COMMAND_KEY = isOsx ? '⌘' : 'Ctrl'

// Translation function - injected from outside, defaults to identity
let _t = key => key

export const setFormatTranslator = t => {
  _t = t
}

export const getIcons = () => [
  {
    type: 'strong',
    tooltip: _t('editor.format.bold'),
    shortcut: `${COMMAND_KEY}+B`,
    icon: strongIcon
  },
  {
    type: 'em',
    tooltip: _t('editor.format.italic'),
    shortcut: `${COMMAND_KEY}+I`,
    icon: emphasisIcon
  },
  {
    type: 'u',
    tooltip: _t('editor.format.underline'),
    shortcut: `${COMMAND_KEY}+U`,
    icon: underlineIcon
  },
  {
    type: 'del',
    tooltip: _t('editor.format.strikethrough'),
    shortcut: `${COMMAND_KEY}+D`,
    icon: strikeIcon
  },
  {
    type: 'mark',
    tooltip: _t('editor.format.highlight'),
    shortcut: `⇧+${COMMAND_KEY}+H`,
    icon: highlightIcon
  },
  {
    type: 'inline_code',
    tooltip: _t('editor.format.inlineCode'),
    shortcut: `${COMMAND_KEY}+\``,
    icon: codeIcon
  },
  {
    type: 'inline_math',
    tooltip: _t('editor.format.inlineMath'),
    shortcut: `⇧+${COMMAND_KEY}+M`,
    icon: mathIcon
  },
  {
    type: 'link',
    tooltip: _t('editor.format.link'),
    shortcut: `${COMMAND_KEY}+L`,
    icon: linkIcon
  },
  {
    type: 'image',
    tooltip: _t('editor.format.image'),
    shortcut: `⇧+${COMMAND_KEY}+I`,
    icon: imageIcon
  },
  {
    type: 'clear',
    tooltip: _t('editor.format.clearFormatting'),
    shortcut: `⇧+${COMMAND_KEY}+R`,
    icon: clearIcon
  }
]

const icons = getIcons()

export default icons
