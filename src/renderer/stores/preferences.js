import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { ipcRenderer } from '../util/electron'
import bus from '../bus'

export const usePreferencesStore = defineStore('preferences', () => {
  // State
  const autoSave = ref(false)
  const autoSaveDelay = ref(5000)
  const titleBarStyle = ref('custom')
  const openFilesInNewWindow = ref(false)
  const openFolderInNewWindow = ref(false)
  const zoom = ref(1.0)
  const hideScrollbar = ref(false)
  const wordWrapInToc = ref(false)
  const fileSortBy = ref('created')
  const startUpAction = ref('lastState')
  const defaultDirectoryToOpen = ref('')
  const language = ref('en')

  const editorFontFamily = ref('Open Sans')
  const fontSize = ref(16)
  const lineHeight = ref(1.6)
  const codeFontSize = ref(14)
  const codeFontFamily = ref('DejaVu Sans Mono')
  const codeBlockLineNumbers = ref(true)
  const trimUnnecessaryCodeBlockEmptyLines = ref(true)
  const editorLineWidth = ref('')

  const autoPairBracket = ref(true)
  const autoPairMarkdownSyntax = ref(true)
  const autoPairQuote = ref(true)
  const endOfLine = ref('default')
  const defaultEncoding = ref('utf8')
  const autoGuessEncoding = ref(true)
  const trimTrailingNewline = ref(2)
  const textDirection = ref('ltr')
  const hideQuickInsertHint = ref(false)
  const imageInsertAction = ref('folder')
  const imagePreferRelativeDirectory = ref(false)
  const imageRelativeDirectoryName = ref('assets')
  const hideLinkPopup = ref(false)
  const autoCheck = ref(false)

  const preferLooseListItem = ref(true)
  const bulletListMarker = ref('-')
  const orderListDelimiter = ref('.')
  const preferHeadingStyle = ref('atx')
  const tabSize = ref(4)
  const listIndentation = ref(1)
  const frontmatterType = ref('-')
  const superSubScript = ref(false)
  const footnote = ref(false)
  const isHtmlEnabled = ref(true)
  const isGitlabCompatibilityEnabled = ref(false)
  const sequenceTheme = ref('hand')

  const theme = ref('light')
  const autoSwitchTheme = ref(2)

  const spellcheckerEnabled = ref(false)
  const spellcheckerNoUnderline = ref(false)
  const spellcheckerLanguage = ref('en-US')

  const sideBarVisibility = ref(false)
  const tabBarVisibility = ref(false)
  const sourceCodeModeEnabled = ref(false)

  const searchExclusions = ref([])
  const searchMaxFileSize = ref('')
  const searchIncludeHidden = ref(false)
  const searchNoIgnore = ref(false)
  const searchFollowSymlinks = ref(true)

  const watcherUsePolling = ref(false)

  // Edit modes of the current window (not part of persistent settings)
  const typewriter = ref(false)
  const focus = ref(false)
  const sourceCode = ref(false)

  // user configuration
  const imageFolderPath = ref('')
  const webImages = ref([])
  const cloudImages = ref([])
  const currentUploader = ref('none')
  const githubToken = ref('')
  const imageBed = reactive({
    github: {
      owner: '',
      repo: '',
      branch: ''
    }
  })
  const cliScript = ref('')

  // Actions
  function setUserPreference (preference) {
    const stateMap = {
      autoSave,
      autoSaveDelay,
      titleBarStyle,
      openFilesInNewWindow,
      openFolderInNewWindow,
      zoom,
      hideScrollbar,
      wordWrapInToc,
      fileSortBy,
      startUpAction,
      defaultDirectoryToOpen,
      language,
      editorFontFamily,
      fontSize,
      lineHeight,
      codeFontSize,
      codeFontFamily,
      codeBlockLineNumbers,
      trimUnnecessaryCodeBlockEmptyLines,
      editorLineWidth,
      autoPairBracket,
      autoPairMarkdownSyntax,
      autoPairQuote,
      endOfLine,
      defaultEncoding,
      autoGuessEncoding,
      trimTrailingNewline,
      textDirection,
      hideQuickInsertHint,
      imageInsertAction,
      imagePreferRelativeDirectory,
      imageRelativeDirectoryName,
      hideLinkPopup,
      autoCheck,
      preferLooseListItem,
      bulletListMarker,
      orderListDelimiter,
      preferHeadingStyle,
      tabSize,
      listIndentation,
      frontmatterType,
      superSubScript,
      footnote,
      isHtmlEnabled,
      isGitlabCompatibilityEnabled,
      sequenceTheme,
      theme,
      autoSwitchTheme,
      spellcheckerEnabled,
      spellcheckerNoUnderline,
      spellcheckerLanguage,
      sideBarVisibility,
      tabBarVisibility,
      sourceCodeModeEnabled,
      searchExclusions,
      searchMaxFileSize,
      searchIncludeHidden,
      searchNoIgnore,
      searchFollowSymlinks,
      watcherUsePolling,
      typewriter,
      focus,
      sourceCode,
      imageFolderPath,
      webImages,
      cloudImages,
      currentUploader,
      githubToken,
      cliScript
    }

    Object.keys(preference).forEach((key) => {
      if (preference[key] !== undefined && stateMap[key] !== undefined) {
        stateMap[key].value = preference[key]
      }
      if (key === 'imageBed' && preference[key]) {
        Object.assign(imageBed, preference[key])
      }
    })
  }

  function setMode ({ type, checked }) {
    if (type === 'typewriter') typewriter.value = checked
    else if (type === 'focus') focus.value = checked
    else if (type === 'sourceCode') sourceCode.value = checked
  }

  function toggleViewMode (entryName) {
    if (entryName === 'typewriter') typewriter.value = !typewriter.value
    else if (entryName === 'focus') focus.value = !focus.value
    else if (entryName === 'sourceCode') sourceCode.value = !sourceCode.value
  }

  function askForUserPreference () {
    ipcRenderer.send('mt::ask-for-user-preference')
    ipcRenderer.send('mt::ask-for-user-data')

    ipcRenderer.on('mt::user-preference', (e, preferences) => {
      setUserPreference(preferences)
    })
  }

  function setSinglePreference ({ type, value }) {
    ipcRenderer.send('mt::set-user-preference', { [type]: value })
  }

  function setUserData ({ type, value }) {
    ipcRenderer.send('mt::set-user-data', { [type]: value })
  }

  function setImageFolderPath (value) {
    ipcRenderer.send('mt::ask-for-modify-image-folder-path', value)
  }

  function selectDefaultDirectoryToOpen () {
    ipcRenderer.send('mt::select-default-directory-to-open')
  }

  function listenForView () {
    ipcRenderer.on('mt::show-command-palette', () => {
      bus.$emit('show-command-palette')
    })
    ipcRenderer.on('mt::toggle-view-mode-entry', (event, entryName) => {
      toggleViewMode(entryName)
      dispatchEditorViewState({ [entryName]: getViewModeValue(entryName) })
    })
  }

  function listenToggleView () {
    bus.$on('view:toggle-view-entry', (entryName) => {
      toggleViewMode(entryName)
      dispatchEditorViewState({ [entryName]: getViewModeValue(entryName) })
    })
  }

  function getViewModeValue (entryName) {
    if (entryName === 'typewriter') return typewriter.value
    if (entryName === 'focus') return focus.value
    if (entryName === 'sourceCode') return sourceCode.value
    return false
  }

  function dispatchEditorViewState (viewState) {
    const { windowId } = window.marktext.env
    ipcRenderer.send('mt::view-layout-changed', windowId, viewState)
  }

  return {
    // State
    autoSave,
    autoSaveDelay,
    titleBarStyle,
    openFilesInNewWindow,
    openFolderInNewWindow,
    zoom,
    hideScrollbar,
    wordWrapInToc,
    fileSortBy,
    startUpAction,
    defaultDirectoryToOpen,
    language,
    editorFontFamily,
    fontSize,
    lineHeight,
    codeFontSize,
    codeFontFamily,
    codeBlockLineNumbers,
    trimUnnecessaryCodeBlockEmptyLines,
    editorLineWidth,
    autoPairBracket,
    autoPairMarkdownSyntax,
    autoPairQuote,
    endOfLine,
    defaultEncoding,
    autoGuessEncoding,
    trimTrailingNewline,
    textDirection,
    hideQuickInsertHint,
    imageInsertAction,
    imagePreferRelativeDirectory,
    imageRelativeDirectoryName,
    hideLinkPopup,
    autoCheck,
    preferLooseListItem,
    bulletListMarker,
    orderListDelimiter,
    preferHeadingStyle,
    tabSize,
    listIndentation,
    frontmatterType,
    superSubScript,
    footnote,
    isHtmlEnabled,
    isGitlabCompatibilityEnabled,
    sequenceTheme,
    theme,
    autoSwitchTheme,
    spellcheckerEnabled,
    spellcheckerNoUnderline,
    spellcheckerLanguage,
    sideBarVisibility,
    tabBarVisibility,
    sourceCodeModeEnabled,
    searchExclusions,
    searchMaxFileSize,
    searchIncludeHidden,
    searchNoIgnore,
    searchFollowSymlinks,
    watcherUsePolling,
    typewriter,
    focus,
    sourceCode,
    imageFolderPath,
    webImages,
    cloudImages,
    currentUploader,
    githubToken,
    imageBed,
    cliScript,
    // Actions
    setUserPreference,
    setMode,
    toggleViewMode,
    askForUserPreference,
    setSinglePreference,
    setUserData,
    setImageFolderPath,
    selectDefaultDirectoryToOpen,
    listenForView,
    listenToggleView,
    dispatchEditorViewState
  }
})
