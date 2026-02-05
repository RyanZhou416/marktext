import path from 'path'

// Declare global __static
declare global {
  var __static: string
}

// Set `__static` path to static files in production.
if (process.env.NODE_ENV !== 'development') {
  global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}
