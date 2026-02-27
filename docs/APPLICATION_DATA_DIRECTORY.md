# Application Data Directory

The per-user application data directory is located in the following directory:

- `%APPDATA%\marktext` on Windows
- `$XDG_CONFIG_HOME/marktext` or `~/.config/marktext` on Linux
- `~/Library/Application Support/marktext` on macOS

When [portable mode](PORTABLE.md) is enabled, the directory location is either the `--user-data-dir` parameter or `marktext-user-data` directory.

## Installer Scope vs Data Scope (Windows)

- Installer scope can be **current user** or **all users**.
- Application data is still **per user** (stored under the current user's profile).
- This means uninstalling the app binary does not always remove user data by default.

The NSIS installer may prompt to remove local user data on uninstall (preferences, recent files, caches).
