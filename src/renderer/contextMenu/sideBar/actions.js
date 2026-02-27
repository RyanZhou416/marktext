import bus from '../../bus'

export const newFile = () => {
  bus.$emit('SIDEBAR::new', 'file')
}

export const newDirectory = () => {
  bus.$emit('SIDEBAR::new', 'directory')
}

export const copy = () => {
  bus.$emit('SIDEBAR::copy-cut', 'copy')
}

export const cut = () => {
  bus.$emit('SIDEBAR::copy-cut', 'cut')
}

export const paste = () => {
  bus.$emit('SIDEBAR::paste')
}

export const rename = () => {
  bus.$emit('SIDEBAR::rename')
}

export const remove = () => {
  bus.$emit('SIDEBAR::remove')
}

export const showInFolder = () => {
  bus.$emit('SIDEBAR::show-in-folder')
}
