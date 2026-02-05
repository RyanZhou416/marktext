// Global polyfill for webpack 5 with contextIsolation
// This provides a 'global' object that points to 'window' in the renderer process
module.exports =
  typeof window !== "undefined"
    ? window
    : typeof global !== "undefined"
    ? global
    : this;
