import editIcon from '../../assets/pngicon/imageEdit/2.png'
import inlineIcon from '../../assets/pngicon/inline_image/2.png'
import leftIcon from '../../assets/pngicon/algin_left/2.png'
import middleIcon from '../../assets/pngicon/algin_center/2.png'
import rightIcon from '../../assets/pngicon/algin_right/2.png'
import deleteIcon from '../../assets/pngicon/image_delete/2.png'

// Translation function - injected from outside, defaults to identity
let _t = key => key

export const setImageToolbarTranslator = t => {
  _t = t
}

export const getIcons = () => [
  {
    type: 'edit',
    tooltip: _t('editor.imageToolbar.editImage'),
    icon: editIcon
  },
  {
    type: 'inline',
    tooltip: _t('editor.imageToolbar.inlineImage'),
    icon: inlineIcon
  },
  {
    type: 'left',
    tooltip: _t('editor.imageToolbar.alignLeft'),
    icon: leftIcon
  },
  {
    type: 'center',
    tooltip: _t('editor.imageToolbar.alignMiddle'),
    icon: middleIcon
  },
  {
    type: 'right',
    tooltip: _t('editor.imageToolbar.alignRight'),
    icon: rightIcon
  },
  {
    type: 'delete',
    tooltip: _t('editor.imageToolbar.removeImage'),
    icon: deleteIcon
  }
]

const icons = getIcons()

export default icons
