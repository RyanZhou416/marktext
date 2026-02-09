import { defineStore } from 'pinia'
import { ipcRenderer, isTauriAvailable } from '../util/tauri'
import bus from '../bus'

export const usePreferencesStore = defineStore('preferences', {
  state: () => ({
    autoSave: false,
    autoSaveDelay: 5000,
    titleBarStyle: 'custom',
    openFilesInNewWindow: false,
    openFolderInNewWindow: false,
    zoom: 1.0,
    hideScrollbar: false,
    wordWrapInToc: false,
    fileSortBy: 'created',
    startUpAction: 'lastState',
    defaultDirectoryToOpen: '',
    language: 'en',

    editorFontFamily: 'Open Sans',
    fontSize: 16,
    lineHeight: 1.6,
    codeFontSize: 14,
    codeFontFamily: 'DejaVu Sans Mono',
    codeBlockLineNumbers: true,
    trimUnnecessaryCodeBlockEmptyLines: true,
    editorLineWidth: '',

    autoPairBracket: true,
    autoPairMarkdownSyntax: true,
    autoPairQuote: true,
    endOfLine: 'default',
    defaultEncoding: 'utf8',
    autoGuessEncoding: true,
    trimTrailingNewline: 2,
    textDirection: 'ltr',
    hideQuickInsertHint: false,
    imageInsertAction: 'folder',
    imagePreferRelativeDirectory: false,
    imageRelativeDirectoryName: 'assets',
    hideLinkPopup: false,
    autoCheck: false,

    preferLooseListItem: true,
    bulletListMarker: '-',
    orderListDelimiter: '.',
    preferHeadingStyle: 'atx',
    tabSize: 4,
    listIndentation: 1,
    frontmatterType: '-',
    superSubScript: false,
    footnote: false,
    isHtmlEnabled: true,
    isGitlabCompatibilityEnabled: false,
    sequenceTheme: 'hand',

    theme: 'light',
    autoSwitchTheme: 2,

    spellcheckerEnabled: false,
    spellcheckerNoUnderline: false,
    spellcheckerLanguage: 'en-US',

    sideBarVisibility: false,
    tabBarVisibility: false,
    sourceCodeModeEnabled: false,

    searchExclusions: [] as string[],
    searchMaxFileSize: '',
    searchIncludeHidden: false,
    searchNoIgnore: false,
    searchFollowSymlinks: true,

    watcherUsePolling: false,

    // Edit modes of the current window (not part of persistent settings)
    typewriter: false,
    focus: false,
    sourceCode: false,

    // user configuration
    imageFolderPath: '',
    webImages: [] as any[],
    cloudImages: [] as any[],
    currentUploader: 'none',
    githubToken: '',
    imageBed: {
      github: {
        owner: '',
        repo: '',
        branch: ''
      }
    },
    cliScript: ''
  }),

  actions: {
    SET_USER_PREFERENCE (preference: Record<string, any>) {
      const oldTitleBarStyle = this.titleBarStyle
      Object.keys(preference).forEach((key) => {
        if (
          typeof preference[key] !== 'undefined' &&
          typeof (this as any)[key] !== 'undefined'
        ) {
          (this as any)[key] = preference[key]
        }
      })
      // Hot-switch title bar style when it changes
      if (preference.titleBarStyle && preference.titleBarStyle !== oldTitleBarStyle) {
        this._applyTitleBarStyle(preference.titleBarStyle)
      }
    },

    SET_MODE ({ type, checked }: { type: string; checked: boolean }) {
      (this as any)[type] = checked
    },

    TOGGLE_VIEW_MODE (entryName: string) {
      const current = (this as any)[entryName]
      // Mutual exclusion: when activating a mode, turn off the others
      const viewModes = ['sourceCode', 'typewriter', 'focus']
      if (!current && viewModes.includes(entryName)) {
        for (const mode of viewModes) {
          if (mode !== entryName) {
            (this as any)[mode] = false
          }
        }
      }
      (this as any)[entryName] = !current
    },

    ASK_FOR_USER_PREFERENCE () {
      ipcRenderer.send('mt::ask-for-user-preference')
      ipcRenderer.send('mt::ask-for-user-data')

      ipcRenderer.on('mt::user-preference', (e: any, preferences: any) => {
        this.SET_USER_PREFERENCE(preferences)
      })

      // Listen for cross-window preference changes (from other Tauri windows)
      if (isTauriAvailable()) {
        import('@tauri-apps/api/event').then(({ listen }) => {
          listen('mt::user-preference-changed', (event: any) => {
            if (event.payload) {
              this.SET_USER_PREFERENCE(event.payload)
            }
          })
        }).catch(() => {})
      }
    },

    SET_SINGLE_PREFERENCE ({ type, value }: { type: string; value: any }) {
      // Update local state immediately so UI reflects the change
      if (typeof (this as any)[type] !== 'undefined') {
        (this as any)[type] = value
      }
      // Persist to backend
      ipcRenderer.send('mt::set-user-preference', { [type]: value })
    },

    SET_USER_DATA ({ type, value }: { type: string; value: any }) {
      ipcRenderer.send('mt::set-user-data', { [type]: value })
    },

    SET_IMAGE_FOLDER_PATH (value: string) {
      ipcRenderer.send('mt::ask-for-modify-image-folder-path', value)
    },

    SELECT_DEFAULT_DIRECTORY_TO_OPEN () {
      ipcRenderer.send('mt::select-default-directory-to-open')
    },

    LISTEN_FOR_VIEW () {
      ipcRenderer.on('mt::show-command-palette', () => {
        bus.$emit('show-command-palette')
      })
      ipcRenderer.on('mt::toggle-view-mode-entry', (event: any, entryName: string) => {
        this.TOGGLE_VIEW_MODE(entryName)
        this.DISPATCH_EDITOR_VIEW_STATE({ [entryName]: (this as any)[entryName] })
      })
    },

    LISTEN_TOGGLE_VIEW () {
      bus.$on('view:toggle-view-entry', (entryName: any) => {
        this.TOGGLE_VIEW_MODE(entryName)
        this.DISPATCH_EDITOR_VIEW_STATE({ [entryName]: (this as any)[entryName] })
      })
    },

    DISPATCH_EDITOR_VIEW_STATE (viewState: Record<string, any>) {
      const { windowId } = (window as any).marktext.env
      ipcRenderer.send('mt::view-layout-changed', windowId, viewState)
    },

    /** Call Rust to toggle native window decorations + menu visibility */
    _applyTitleBarStyle (style: string) {
      if (isTauriAvailable()) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('set_title_bar_style', { style }).catch((e: any) => {
            console.error('Failed to set title bar style:', e)
          })
        }).catch(() => {})
      }
    }
  }
})
