/**
 * Snap.svg shim for ES module compatibility
 * This file wraps the UMD snap.svg library for use with Vite/ES modules
 */

// Import the minified snap.svg which attaches to window
import './snap.svg-min.js'

// Export the global Snap object
export default window.Snap
