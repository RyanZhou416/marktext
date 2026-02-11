# Debugging

> For the archived Electron-era debugging guide, see [archive/DEBUGGING_ELECTRON.md](archive/DEBUGGING_ELECTRON.md).

## Development Mode

Start the application in development mode:

```bash
npm run tauri:dev
```

This launches:

- **Vite dev server** on `http://localhost:5173` (frontend with HMR)
- **Tauri application** loading the dev server URL

## Frontend Debugging (WebView)

### Browser Developer Tools

Open the WebView developer tools:

- Use the menu: `View -> Toggle Developer Tools`
- Or press `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (macOS)

From the DevTools you can:

- Inspect DOM elements and Vue components
- Debug JavaScript with breakpoints
- Profile rendering performance
- Monitor network requests

### Vue DevTools

Install the [Vue DevTools](https://devtools.vuejs.org/) browser extension for inspecting:

- Component tree and props
- Pinia store state
- Vue Router routes
- Event timeline

## Rust Backend Debugging

### Console Output

Rust `println!` and `eprintln!` output appears in the terminal where `npm run tauri:dev` was launched. Use Tauri's logging:

```rust
use tauri::Manager;
println!("Debug: {:?}", some_value);
```

### VS Code Debugging

1. Install the [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) extension
2. Add a launch configuration in `.vscode/launch.json`:

```json
{
  "type": "lldb",
  "request": "launch",
  "name": "Debug Tauri",
  "cargo": {
    "args": ["build", "--manifest-path=./src-tauri/Cargo.toml"]
  },
  "preLaunchTask": "ui:dev"
}
```

3. Set breakpoints in Rust source files and start debugging

### Tauri Logs

Set the `RUST_LOG` environment variable for detailed Tauri logging:

```bash
# Windows PowerShell
$env:RUST_LOG="debug"
npm run tauri:dev

# Linux/macOS
RUST_LOG=debug npm run tauri:dev
```

## Performance Profiling

### Frontend Performance

1. Open DevTools → Performance tab
2. Record a session while performing the action to profile
3. Analyze the flame chart for bottlenecks

### Rust Performance

Use `cargo flamegraph` for Rust-side profiling:

```bash
cd src-tauri
cargo install flamegraph
cargo flamegraph
```
