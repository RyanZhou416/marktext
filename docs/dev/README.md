# Developer Documentation

Welcome to developer documentation of MarkText.

- [Project architecture](ARCHITECTURE.md)
- [Build instructions](BUILD.md)
- [Build on Windows](BUILD_WINDOWS.md)
- [Debugging](DEBUGGING.md)
- [Interface](INTERFACE.md)
- [Project analysis](PROJECT_ANALYSIS.md)
- [Upgrade roadmap](UPGRADE_ROADMAP.md)
- [Steps to release MarkText](RELEASE.md)
- [Prepare a hotfix](RELEASE_HOTFIX.md)
- [Internal documentation](code/README.md)

## Code Quality Tools

The project enforces code quality with the following toolchain:

| Tool                                                      | Purpose                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| [ESLint](https://eslint.org/)                             | Linting for JS, TS, and Vue files                                    |
| [Prettier](https://prettier.io/)                          | Automatic code formatting                                            |
| [Husky](https://typicode.github.io/husky/)                | Git hooks management                                                 |
| [lint-staged](https://github.com/lint-staged/lint-staged) | Run linters on staged files                                          |
| [commitlint](https://commitlint.js.org/)                  | Enforce [Conventional Commits](https://www.conventionalcommits.org/) |

Pre-commit hooks automatically lint and format staged files. Commit messages are validated against the Conventional Commits specification.
