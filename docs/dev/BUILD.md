# Build Instructions

Clone the repository:

```
git clone https://github.com/marktext/marktext.git
```

### Prerequisites

Before you can get started developing, you need set up your build environment:

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) v18+ (recommended to use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows))
- [Yarn](https://yarnpkg.com/) v1.x (`npm install -g yarn`)
- Platform-specific [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- Build is supported on Linux, macOS and Windows

**Additional development dependencies on Linux:**

- libX11 (with headers)
- libxkbfile (with headers)
- libsecret (with headers)
- libfontconfig (with headers)
- WebKit2GTK (with headers)

On Debian-based Linux: `sudo apt-get install libx11-dev libxkbfile-dev libsecret-1-dev libfontconfig-dev libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`

On Red Hat-based Linux: `sudo dnf install libX11-devel libxkbfile-devel libsecret-devel fontconfig-devel webkit2gtk4.1-devel openssl-devel curl wget file libxdo-devel librsvg2-devel`

**Additional development dependencies on Windows:**

- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10/11)
- Visual Studio 2022 with C++ build tools
- Or run the setup script: `scripts\setup-tauri-env.cmd`

### Let's build

1. Go to `marktext` folder
2. Install dependencies: `yarn install`
3. Development mode: `yarn tauri:dev`
4. Production build: `yarn tauri:build`

Build output is located in `src-tauri/target/release/bundle/`.

### Important scripts

```
$ yarn run <script>
```

| Script         | Description                                |
| -------------- | ------------------------------------------ |
| `tauri:dev`    | Build and run MarkText in development mode |
| `tauri:build`  | Build MarkText for production              |
| `dev`          | Start Vite dev server (frontend only)      |
| `build`        | Build frontend for production              |
| `lint`         | Lint code style (JS, TS, Vue)              |
| `lint:fix`     | Auto-fix lint errors                       |
| `format`       | Format code with Prettier                  |
| `format:check` | Check code formatting without writing      |
| `test`         | Run tests                                  |
| `test:specs`   | Run CommonMark/GFM spec compliance tests   |
| `build:muya`   | Build Muya editor library                  |

### Code quality

The project uses the following tools to ensure code quality:

- **ESLint** - Linting for JS, TS, and Vue files
- **Prettier** - Automatic code formatting
- **Husky + lint-staged** - Pre-commit hooks to lint and format staged files
- **commitlint** - Enforces [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

For more scripts please see `package.json`.
