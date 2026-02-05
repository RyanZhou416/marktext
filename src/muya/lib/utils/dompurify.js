import DOMPurify from 'dompurify'

// DOMPurify ES module exports the instance as default
export const isValidAttribute = DOMPurify.isValidAttribute

export default DOMPurify.sanitize.bind(DOMPurify)
