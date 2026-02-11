# Inter-Process Communication (IPC)

> For the archived Electron-era IPC documentation, see [../archive/IPC_ELECTRON.md](../archive/IPC_ELECTRON.md).

## Tauri IPC Model

MarkText uses [Tauri's IPC system](https://v2.tauri.app/develop/calling-rust/) for communication between the Vue frontend (WebView) and the Rust backend.

### Frontend → Backend (Commands)

The frontend invokes Rust functions using `@tauri-apps/api`:

```typescript
import { invoke } from '@tauri-apps/api/core'

// Call a Tauri command
const result = await invoke('command_name', { arg1: 'value', arg2: 42 })
```

Commands are defined in `src-tauri/src/commands/`:

```rust
#[tauri::command]
fn command_name(arg1: String, arg2: i32) -> Result<String, String> {
    // Handle the command
    Ok("result".to_string())
}
```

### Backend → Frontend (Events)

The Rust backend can emit events to the frontend:

```rust
use tauri::Manager;

app.emit("event-name", payload)?;
```

The frontend listens for events:

```typescript
import { listen } from '@tauri-apps/api/event'

const unlisten = await listen('event-name', event => {
  console.log('Received:', event.payload)
})
```

### Tauri Plugins

For common OS operations, MarkText uses official Tauri plugins instead of raw IPC:

| Plugin                                 | Usage                            |
| -------------------------------------- | -------------------------------- |
| `@tauri-apps/plugin-fs`                | File system operations           |
| `@tauri-apps/plugin-dialog`            | Native file/message dialogs      |
| `@tauri-apps/plugin-shell`             | Shell command execution          |
| `@tauri-apps/plugin-clipboard-manager` | Clipboard read/write             |
| `@tauri-apps/plugin-window-state`      | Window position/size persistence |
| `@tauri-apps/plugin-process`           | Process management               |
| `@tauri-apps/plugin-os`                | OS information                   |

### Permissions

Tauri commands and plugin access require explicit permissions configured in `src-tauri/capabilities/default.json`.
