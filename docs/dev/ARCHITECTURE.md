# Project Architecture

> For the archived Electron-era architecture documentation, see [archive/ARCHITECTURE_ELECTRON.md](archive/ARCHITECTURE_ELECTRON.md).

## Overview

MarkText is a cross-platform desktop markdown editor built with **Tauri 2.0** (Rust backend) and **Vue 3** (frontend). The application can be split into three parts:

1. **Tauri Backend** (`src-tauri/`): Rust process handling system-level operations (file I/O, dialogs, window management, OS integration)
2. **Vue Frontend** (`src/renderer/`): The editor UI built with Vue 3, Pinia, and Vue Router
3. **Muya** (`src/muya/`): The custom markdown editor engine (pure JavaScript, DOM APIs only)

## Project Structure

```
marktext/
├── src-tauri/                # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs           # Application entry point
│   │   ├── lib.rs            # Library entry (Tauri setup)
│   │   └── commands/         # Tauri command handlers
│   ├── capabilities/         # Tauri permission config
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
│
├── src/
│   ├── renderer/             # Vue 3 frontend
│   │   ├── main.ts           # Frontend entry point
│   │   ├── App.vue           # Root component
│   │   ├── components/       # Vue components
│   │   ├── pages/            # Page views (app, preference)
│   │   ├── stores/           # Pinia stores (TypeScript)
│   │   ├── router/           # Vue Router config
│   │   ├── i18n/             # Internationalization
│   │   ├── assets/           # Styles, icons, themes
│   │   └── util/             # Utility functions
│   │
│   ├── muya/                 # Muya editor engine
│   │   ├── lib/              # Core library
│   │   │   ├── index.js      # Editor entry
│   │   │   ├── contentState/ # Content state management
│   │   │   ├── parser/       # Markdown parsing
│   │   │   ├── selection/    # Selection management
│   │   │   ├── eventHandler/ # Event handling
│   │   │   ├── ui/           # UI float components
│   │   │   └── renderers/    # Snabbdom rendering
│   │   └── themes/           # Editor themes
│   │
│   ├── common/               # Shared code (TS)
│   │   ├── commands/         # Command constants
│   │   ├── filesystem/       # File system utilities
│   │   └── keybinding/       # Keybinding utilities
│   │
│   └── locales/              # Translation files
│
├── test/                     # Tests
│   ├── e2e/                  # Playwright E2E tests
│   ├── specs/                # CommonMark/GFM spec tests
│   └── unit/                 # Unit tests
│
├── resources/                # App resources (icons, etc.)
├── docs/                     # Documentation
├── tools/                    # Build/utility scripts
└── scripts/                  # Platform setup scripts
```

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   Tauri Backend (Rust)                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐ │
│  │  Window   │  │   File   │  │  Dialog   │  │   Shell    │ │
│  │ Manager   │  │  System  │  │  System   │  │  Commands  │ │
│  └──────────┘  └──────────┘  └───────────┘  └────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐                  │
│  │Clipboard │  │ OS Info  │  │  Updater  │                  │
│  └──────────┘  └──────────┘  └───────────┘                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ Tauri IPC (invoke / events)
┌────────────────────────┴─────────────────────────────────────┐
│                    WebView (Frontend)                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Vue 3 Application                      │ │
│  │  ┌─────────┐  ┌────────┐  ┌──────────┐  ┌───────────┐ │ │
│  │  │ Pinia   │  │ Router │  │Components│  │   i18n    │ │ │
│  │  │ Stores  │  │        │  │          │  │           │ │ │
│  │  └─────────┘  └────────┘  └──────────┘  └───────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Muya Editor Engine                      │ │
│  │  ┌──────────┐  ┌────────┐  ┌────────┐  ┌───────────┐  │ │
│  │  │ Content  │  │ Parser │  │  UI    │  │ Selection │  │ │
│  │  │  State   │  │        │  │ Floats │  │  System   │  │ │
│  │  └──────────┘  └────────┘  └────────┘  └───────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Communication

The Tauri backend and frontend communicate via **Tauri IPC**:

- **Frontend → Backend**: `invoke()` calls to Tauri commands defined in `src-tauri/src/commands/`
- **Backend → Frontend**: Event emission via Tauri's event system
- **Tauri plugins** provide high-level APIs for common operations (file dialog, clipboard, shell, etc.)

## Muya Editor Engine

Muya is the core markdown editing engine. It uses **pure JavaScript and DOM APIs** (no framework dependencies) and provides:

- Real-time preview (WYSIWYG) editing
- Markdown parsing (CommonMark, GFM, partial Pandoc support)
- Virtual DOM rendering via Snabbdom
- Content state management
- Selection and cursor handling
- UI float components (format picker, quick insert, emoji picker, etc.)

Muya is bundled separately via Webpack and consumed by the Vue frontend.

## Build System

- **Frontend**: Vite (`vite.config.mjs`) → `out/renderer/`
- **Backend**: Cargo (via Tauri CLI) → `src-tauri/target/`
- **Muya**: Webpack (`src/muya/webpack.config.js`) → `src/muya/dist/`
- **Production**: `npm run tauri:build` orchestrates both frontend and backend builds
