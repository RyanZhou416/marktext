<template>
  <div
    class="editor-wrapper"
    :class="[{ typewriter: typewriter, focus: focus, source: sourceCode }]"
    :style="{
      lineHeight: lineHeight,
      fontSize: `${fontSize}px`,
      'font-family': editorFontFamily
        ? `${editorFontFamily}, ${defaultFontFamily}`
        : `${defaultFontFamily}`
    }"
    :dir="textDirection"
  >
    <EditorContextMenu
      :has-selection="editorContextState.hasSelection"
      :is-link="editorContextState.isLink"
      :is-image="editorContextState.isImage"
      @action="handleEditorContextAction"
    >
      <div class="editor-context-trigger">
        <div ref="editor" class="editor-component"></div>
      </div>
    </EditorContextMenu>
    <ImageViewer
      v-if="imageViewerVisible"
      :visible="imageViewerVisible"
      :urls="imageViewerUrls"
      :initial-index="0"
      @close="setImageViewerVisible(false)"
    />
    <AppDialog v-model:open="dialogTableVisible" title="Insert Table" width="454px">
      <div class="form">
        <div class="form-item">
          <label>Rows</label>
          <input
            ref="rowInput"
            v-model.number="tableChecker.rows"
            type="number"
            min="1"
            max="30"
            class="input-number"
          />
        </div>
        <div class="form-item">
          <label>Columns</label>
          <input
            v-model.number="tableChecker.columns"
            type="number"
            min="1"
            max="20"
            class="input-number"
          />
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-default" @click="dialogTableVisible = false">Cancel</button>
        <button class="btn-primary" @click="handleDialogTableConfirm">OK</button>
      </div>
    </AppDialog>
    <search v-if="!sourceCode"></search>
  </div>
</template>

<script lang="ts">
import { shell, path, processInfo, fs as electronFs, ipcRenderer } from '../../util/tauri'
import log from '../../util/logger'
import { mapState } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import { useEditorStore } from '@/stores/editor'
import { useProjectStore } from '@/stores/project'
import { isChildOfDirectory } from 'common/filesystem/paths'
import { createEditorEngine } from '@/editor'
import AppDialog from '@/components/common/AppDialog.vue'
import ImageViewer from '@/components/common/ImageViewer.vue'
import EditorContextMenu from './EditorContextMenu.vue'
import Search from '../search'
import bus from '@/bus'
import { DEFAULT_EDITOR_FONT_FAMILY } from '@/config'
import notice from '@/services/notification'
import Printer from '@/services/printService'
import { SpellcheckerLanguageCommand } from '@/commands'
import { SpellChecker } from '@/spellchecker'
import { useEventListener } from '@vueuse/core'
import { isOsx, animatedScrollTo } from '@/util'
import { moveImageToFolder, moveToRelativeFolder, uploadImage } from '@/util/fileSystem'
import { guessClipboardFilePath } from '@/util/clipboard'
import { getCssForOptions, getHtmlToc } from '@/util/pdf'
import { addCommonStyle, setEditorWidth } from '@/util/theme'

import 'muya/themes/default.css'
import '@/assets/themes/codemirror/one-dark.css'
import CloseIcon from '@/assets/icons/close.svg'

const STANDAR_Y = 320

export default {
  components: {
    AppDialog,
    EditorContextMenu,
    Search,
    ImageViewer
  },

  props: {
    markdown: String,
    cursor: Object,
    textDirection: {
      type: String,
      required: true
    },
    platform: String
  },

  data() {
    this.defaultFontFamily = DEFAULT_EDITOR_FONT_FAMILY
    this.CloseIcon = CloseIcon

    return {
      selectionChange: null,
      editor: null,
      suppressNextEditorChange: false,
      pathname: '',
      isShowClose: false,
      dialogTableVisible: false,
      imageViewerVisible: false,
      imageViewerUrls: [],
      editorContextState: {
        hasSelection: false,
        isLink: false,
        isImage: false,
        linkHref: '',
        imageSrc: ''
      },
      tableChecker: {
        rows: 4,
        columns: 3
      }
    }
  },

  computed: {
    ...mapState(usePreferencesStore, {
      preferences: store => store.$state
    }),
    ...mapState(usePreferencesStore, [
      'language',
      'preferLooseListItem',
      'autoPairBracket',
      'autoPairMarkdownSyntax',
      'autoPairQuote',
      'bulletListMarker',
      'orderListDelimiter',
      'tabSize',
      'listIndentation',
      'frontmatterType',
      'superSubScript',
      'footnote',
      'isHtmlEnabled',
      'isGitlabCompatibilityEnabled',
      'lineHeight',
      'fontSize',
      'codeFontSize',
      'codeFontFamily',
      'codeBlockLineNumbers',
      'trimUnnecessaryCodeBlockEmptyLines',
      'editorFontFamily',
      'hideQuickInsertHint',
      'autoCheck',
      'editorLineWidth',
      'imageInsertAction',
      'imagePreferRelativeDirectory',
      'imageRelativeDirectoryName',
      'imageFolderPath',
      'imageBorderRadius',
      'localAssetDefaultFolder',
      'theme',
      'sequenceTheme',
      'hideScrollbar',
      'spellcheckerEnabled',
      'spellcheckerNoUnderline',
      'spellcheckerLanguage',
      // edit modes
      'typewriter',
      'focus',
      'sourceCode'
    ]),
    ...mapState(useEditorStore, ['currentFile']),
    ...mapState(useProjectStore, ['projectTree'])
  },

  watch: {
    typewriter: function (value) {
      if (value) {
        this.scrollToCursor()
      }
    },

    focus: function (value) {
      this.editor.setFocusMode(value)
    },

    fontSize: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setFont({ fontSize: value })
      }
    },

    lineHeight: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setFont({ lineHeight: value })
      }
    },

    preferLooseListItem: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({
          preferLooseListItem: value
        })
      }
    },

    tabSize: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setTabSize(value)
      }
    },

    theme: function (value, oldValue) {
      if (value !== oldValue && this.editor) {
        // Agreement：Any black series theme needs to contain dark `word`.
        if (/dark/i.test(value)) {
          this.editor.setOptions(
            {
              mermaidTheme: 'dark',
              vegaTheme: 'dark'
            },
            true
          )
        } else {
          this.editor.setOptions(
            {
              mermaidTheme: 'default',
              vegaTheme: 'latimes'
            },
            true
          )
        }
      }
    },

    sequenceTheme: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ sequenceTheme: value }, true)
      }
    },

    listIndentation: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setListIndentation(value)
      }
    },

    frontmatterType: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ frontmatterType: value })
      }
    },

    superSubScript: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ superSubScript: value }, true)
      }
    },

    footnote: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ footnote: value }, true)
      }
    },

    isHtmlEnabled: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ disableHtml: !value }, true)
      }
    },

    isGitlabCompatibilityEnabled: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ isGitlabCompatibilityEnabled: value }, true)
      }
    },

    hideQuickInsertHint: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ hideQuickInsertHint: value })
      }
    },

    editorLineWidth: function (value, oldValue) {
      if (value !== oldValue) {
        setEditorWidth(value)
      }
    },

    autoPairBracket: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ autoPairBracket: value })
      }
    },

    autoPairMarkdownSyntax: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ autoPairMarkdownSyntax: value })
      }
    },

    autoPairQuote: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ autoPairQuote: value })
      }
    },

    trimUnnecessaryCodeBlockEmptyLines: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ trimUnnecessaryCodeBlockEmptyLines: value })
      }
    },

    bulletListMarker: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ bulletListMarker: value })
      }
    },

    orderListDelimiter: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ orderListDelimiter: value })
      }
    },

    autoCheck: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ autoCheck: value })
      }
    },

    codeFontSize: function (value, oldValue) {
      if (value !== oldValue) {
        addCommonStyle({
          codeFontSize: value,
          codeFontFamily: this.codeFontFamily,
          hideScrollbar: this.hideScrollbar
        })
      }
    },

    codeBlockLineNumbers: function (value, oldValue) {
      const { editor } = this
      if (value !== oldValue && editor) {
        editor.setOptions({ codeBlockLineNumbers: value }, true)
      }
    },

    codeFontFamily: function (value, oldValue) {
      if (value !== oldValue) {
        addCommonStyle({
          codeFontSize: this.codeFontSize,
          codeFontFamily: value,
          hideScrollbar: this.hideScrollbar
        })
      }
    },

    hideScrollbar: function (value, oldValue) {
      if (value !== oldValue) {
        addCommonStyle({
          codeFontSize: this.codeFontSize,
          codeFontFamily: this.codeFontFamily,
          hideScrollbar: value
        })
      }
    },

    spellcheckerEnabled: function (value, oldValue) {
      if (value !== oldValue) {
        const { editor, spellchecker, spellcheckerLanguage } = this

        // Set Muya's spellcheck container attribute.
        editor.setOptions({ spellcheckEnabled: value })

        // Disable native spell checker
        if (value) {
          spellchecker.activateSpellchecker(spellcheckerLanguage)
        } else {
          spellchecker.deactivateSpellchecker()
        }
      }
    },

    spellcheckerNoUnderline: function (value, oldValue) {
      if (value !== oldValue) {
        // Set Muya's spellcheck container attribute.
        this.editor.setOptions({ spellcheckEnabled: !value })
      }
    },

    spellcheckerLanguage: function (value, oldValue) {
      if (value !== oldValue) {
        this.spellchecker.lang = value
      }
    },

    currentFile: function (value, oldValue) {
      if (value && value !== oldValue) {
        this.updateAssetBaseDir()
        this.scrollToCursor(0)
        this.scanMissingImagesOnOpen()
        // Hide float tools if needed.
        this.editor && this.editor.hideAllFloatTools()
      }
    },

    sourceCode: function (value, oldValue) {
      if (value && value !== oldValue) {
        this.editor && this.editor.hideAllFloatTools()
      }
    },

    language: function (value, oldValue) {
      if (value !== oldValue) {
        this.applyQuickInsertHintText()
      }
    },

    imageBorderRadius: function (value, oldValue) {
      if (value !== oldValue) {
        this.applyImageBorderRadius()
      }
    }
  },

  created() {
    this.$nextTick(async () => {
      this.printer = new Printer()
      const editorStore = useEditorStore()
      const ele = this.$refs.editor
      const {
        focus: focusMode,
        markdown,
        preferLooseListItem,
        typewriter,
        autoPairBracket,
        autoPairMarkdownSyntax,
        autoPairQuote,
        trimUnnecessaryCodeBlockEmptyLines,
        bulletListMarker,
        orderListDelimiter,
        tabSize,
        fontSize,
        lineHeight,
        codeBlockLineNumbers,
        listIndentation,
        frontmatterType,
        superSubScript,
        footnote,
        isHtmlEnabled,
        isGitlabCompatibilityEnabled,
        hideQuickInsertHint,
        editorLineWidth,
        theme,
        sequenceTheme,
        spellcheckerEnabled,
        spellcheckerLanguage,
        autoCheck
      } = this

      const options = {
        focusMode,
        markdown,
        preferLooseListItem,
        autoPairBracket,
        autoPairMarkdownSyntax,
        trimUnnecessaryCodeBlockEmptyLines,
        autoPairQuote,
        bulletListMarker,
        orderListDelimiter,
        tabSize,
        fontSize,
        lineHeight,
        codeBlockLineNumbers,
        listIndentation,
        frontmatterType,
        superSubScript,
        footnote,
        disableHtml: !isHtmlEnabled,
        isGitlabCompatibilityEnabled,
        hideQuickInsertHint,
        autoCheck,
        sequenceTheme,
        spellcheckEnabled: spellcheckerEnabled,
        imageAction: this.imageAction.bind(this),
        imagePathPicker: this.imagePathPicker.bind(this),
        clipboardFilePath: guessClipboardFilePath,
        imagePathAutoComplete: this.imagePathAutoComplete.bind(this),
        unsplashAccessKey: processInfo.env.UNSPLASH_ACCESS_KEY,
        photoCreatorClick: this.photoCreatorClick,
        jumpClick: this.jumpClick.bind(this)
      }

      if (/dark/i.test(theme)) {
        Object.assign(options, {
          mermaidTheme: 'dark',
          vegaTheme: 'dark'
        })
      } else {
        Object.assign(options, {
          mermaidTheme: 'default',
          vegaTheme: 'latimes'
        })
      }

      const engineType =
        (window as { __TAURI_ENV__?: { editorEngine?: string } }).__TAURI_ENV__?.editorEngine ||
        'muya'
      this.editor = createEditorEngine(engineType as 'muya' | 'milkdown')
      const mountResult = this.editor.mount(ele, options)
      if (mountResult && typeof mountResult.then === 'function') {
        await mountResult
      }
      const { container } = this.editor
      this.applyQuickInsertHintText()

      // Sync current file content (handles race when file-loaded fired before listener)
      const currentFile = editorStore.currentFile
      if (currentFile?.markdown != null) {
        this.suppressNextEditorChange = true
        this.editor.setMarkdown(currentFile.markdown, currentFile.cursor, true)
      }
      this.updateAssetBaseDir()
      this.applyImageBorderRadius()

      // Create spell check wrapper and enable spell checking if preferred.
      this.spellchecker = new SpellChecker(spellcheckerEnabled, spellcheckerLanguage)

      // Register command palette entry for switching spellchecker language.
      this.switchLanguageCommand = new SpellcheckerLanguageCommand(this.spellchecker)
      setTimeout(() => bus.$emit('cmd::register-command', this.switchLanguageCommand), 100)

      if (typewriter) {
        this.scrollToCursor()
      }

      // listen for bus events.
      bus.$on('file-loaded', this.setMarkdownToEditor)
      bus.$on('invalidate-image-cache', this.handleInvalidateImageCache)
      bus.$on('undo', this.handleUndo)
      bus.$on('redo', this.handleRedo)
      bus.$on('selectAll', this.handleSelectAll)
      bus.$on('export', this.handleExport)
      bus.$on('print-service-clearup', this.handlePrintServiceClearup)
      bus.$on('paragraph', this.handleEditParagraph)
      bus.$on('format', this.handleInlineFormat)
      bus.$on('searchValue', this.handleSearch)
      bus.$on('replaceValue', this.handReplace)
      bus.$on('find-action', this.handleFindAction)
      bus.$on('insert-image', this.insertImage)
      bus.$on('image-uploaded', this.handleUploadedImage)
      bus.$on('file-changed', this.handleFileChange)
      bus.$on('editor-blur', this.blurEditor)
      bus.$on('editor-focus', this.focusEditor)
      bus.$on('copyAsMarkdown', this.handleCopyPaste)
      bus.$on('copyAsHtml', this.handleCopyPaste)
      bus.$on('pasteAsPlainText', this.handleCopyPaste)
      bus.$on('duplicate', this.handleParagraph)
      bus.$on('createParagraph', this.handleParagraph)
      bus.$on('deleteParagraph', this.handleParagraph)
      bus.$on('insertParagraph', this.handleInsertParagraph)
      bus.$on('scroll-to-header', this.scrollToHeader)
      bus.$on('screenshot-captured', this.handleScreenShot)
      bus.$on('switch-spellchecker-language', this.switchSpellcheckLanguage)
      bus.$on('open-command-spellchecker-switch-language', this.openSpellcheckerLanguageCommand)
      bus.$on('replace-misspelling', this.replaceMisspelling)
      bus.$on('enable-local-assets-for-current-file', this.handleEnableLocalAssetsForCurrentFile)
      bus.$on('migrate-asset-folder-request', this.handleMigrateAssetFolderRequest)

      this.editor.on('change', changes => {
        if (this.suppressNextEditorChange) {
          this.suppressNextEditorChange = false
          return
        }
        // WORKAROUND: "id: 'muya'"
        editorStore.LISTEN_FOR_CONTENT_CHANGE(Object.assign(changes, { id: 'muya' }))
      })

      this.editor.on('format-click', ({ event, formatType, data }) => {
        const ctrlOrMeta = (isOsx && event.metaKey) || (!isOsx && event.ctrlKey)
        if (formatType === 'link' && ctrlOrMeta) {
          this.jumpClick(data)
        } else if (formatType === 'image' && ctrlOrMeta) {
          this.imageViewerUrls = [data]
          this.setImageViewerVisible(true)
        }
      })

      this.editor.on('preview-image', ({ data }) => {
        this.imageViewerUrls = [data]
        this.setImageViewerVisible(true)
      })

      this.editor.on('selectionChange', changes => {
        if (!changes || !changes.cursorCoords) return
        const { y } = changes.cursorCoords
        if (this.typewriter) {
          const startPosition = container.scrollTop
          const toPosition = startPosition + y - STANDAR_Y

          // Prevent micro shakes and unnecessary scrolling.
          if (Math.abs(startPosition - toPosition) > 2) {
            animatedScrollTo(container, toPosition, 100)
          }
        }

        // Used to fix #628: auto scroll cursor to visible if the cursor is too low.
        if (container.clientHeight - y < 100) {
          // editableHeight is the lowest cursor position(till to top) that editor allowed.
          const editableHeight = container.clientHeight - 100
          animatedScrollTo(container, container.scrollTop + (y - editableHeight), 0)
        }

        this.selectionChange = changes
        editorStore.SELECTION_CHANGE(changes)
      })

      this.editor.on('selectionFormats', formats => {
        editorStore.SELECTION_FORMATS(formats)
      })

      this.editor.on('contextmenu', (event, sectionChanges) => {
        this.updateEditorContextState(event, sectionChanges)
      })

      useEventListener(document, 'keyup', this.keyup)
      useEventListener(window, 'mt-image-action-error', this.handleImageActionErrorEvent)

      setEditorWidth(editorLineWidth)
    })
  },
  beforeUnmount() {
    bus.$off('file-loaded', this.setMarkdownToEditor)
    bus.$off('invalidate-image-cache', this.handleInvalidateImageCache)
    bus.$off('undo', this.handleUndo)
    bus.$off('redo', this.handleRedo)
    bus.$off('selectAll', this.handleSelectAll)
    bus.$off('export', this.handleExport)
    bus.$off('print-service-clearup', this.handlePrintServiceClearup)
    bus.$off('paragraph', this.handleEditParagraph)
    bus.$off('format', this.handleInlineFormat)
    bus.$off('searchValue', this.handleSearch)
    bus.$off('replaceValue', this.handReplace)
    bus.$off('find-action', this.handleFindAction)
    bus.$off('insert-image', this.insertImage)
    bus.$off('image-uploaded', this.handleUploadedImage)
    bus.$off('file-changed', this.handleFileChange)
    bus.$off('editor-blur', this.blurEditor)
    bus.$off('editor-focus', this.focusEditor)
    bus.$off('copyAsMarkdown', this.handleCopyPaste)
    bus.$off('copyAsHtml', this.handleCopyPaste)
    bus.$off('pasteAsPlainText', this.handleCopyPaste)
    bus.$off('duplicate', this.handleParagraph)
    bus.$off('createParagraph', this.handleParagraph)
    bus.$off('deleteParagraph', this.handleParagraph)
    bus.$off('insertParagraph', this.handleInsertParagraph)
    bus.$off('scroll-to-header', this.scrollToHeader)
    bus.$off('screenshot-captured', this.handleScreenShot)
    bus.$off('switch-spellchecker-language', this.switchSpellcheckLanguage)
    bus.$off('open-command-spellchecker-switch-language', this.openSpellcheckerLanguageCommand)
    bus.$off('replace-misspelling', this.replaceMisspelling)
    bus.$off('enable-local-assets-for-current-file', this.handleEnableLocalAssetsForCurrentFile)
    bus.$off('migrate-asset-folder-request', this.handleMigrateAssetFolderRequest)

    this.editor?.destroy()
    this.editor = null
  },
  methods: {
    applyImageBorderRadius() {
      const radius = Number.isFinite(this.imageBorderRadius) ? this.imageBorderRadius : 8
      document.documentElement.style.setProperty('--mt-image-border-radius', `${radius}px`)
    },

    handleEnableLocalAssetsForCurrentFile(folderName = 'images') {
      const { pathname } = this.currentFile || {}
      if (!pathname || !this.editor) {
        notice.notify({
          title: 'Image',
          type: 'warning',
          message: '请先保存当前文档，再启用本地资产。'
        })
        return
      }

      const markdown = this.editor.getMarkdown() || ''
      const normalizedFolder = String(folderName || 'images').trim() || 'images'
      let nextMarkdown = markdown

      if (/^---\n[\s\S]*?\n---/.test(markdown)) {
        if (/^\s*marktext-assets\s*:/m.test(markdown)) {
          nextMarkdown = markdown.replace(
            /^(\s*marktext-assets\s*:\s*).+$/m,
            `$1${normalizedFolder}`
          )
        } else {
          nextMarkdown = markdown.replace(/^---\n([\s\S]*?)\n---/, (_m, content) => {
            return `---\n${content}\nmarktext-assets: ${normalizedFolder}\n---`
          })
        }
      } else {
        nextMarkdown = `---\nmarktext-assets: ${normalizedFolder}\n---\n\n${markdown}`
      }

      this.suppressNextEditorChange = true
      this.editor.setMarkdown(nextMarkdown, this.currentFile.cursor, false)
      this.updateAssetBaseDir()
      notice.notify({
        title: 'Image',
        type: 'success',
        message: `已启用本地资产文件夹：${normalizedFolder}`
      })
    },

    async handleMigrateAssetFolderRequest() {
      const oldBaseDir = (window as any).__MT_ASSET_BASE_DIR
      if (!oldBaseDir || !this.editor) {
        notice.notify({
          title: 'Image',
          type: 'warning',
          message: '当前文档未配置可迁移的资源目录。'
        })
        return
      }

      const newBaseDir = window.prompt('请输入新的资源文件夹绝对路径：', this.imageFolderPath || '')
      if (!newBaseDir || newBaseDir === oldBaseDir) return

      const markdown = this.editor.getMarkdown() || ''
      const refs = Array.from(markdown.matchAll(/marktext-asset:\/\/([^\s)]+)/g)).map(m => m[1])
      const uniqueRefs = [...new Set(refs)]

      for (const relativeRef of uniqueRefs) {
        const sourcePath = path.join(oldBaseDir, relativeRef)
        const targetPath = path.join(newBaseDir, relativeRef)
        if (await this.pathExists(sourcePath)) {
          await electronFs.mkdir(path.dirname(targetPath), { recursive: true })
          await electronFs.copyFile(sourcePath, targetPath)
          await electronFs.rm(sourcePath, { force: true })
        }
      }

      usePreferencesStore().SET_SINGLE_PREFERENCE({ type: 'imageFolderPath', value: newBaseDir })
      ;(window as any).__MT_ASSET_BASE_DIR = newBaseDir
      notice.notify({
        title: 'Image',
        type: 'success',
        message: '资源文件夹迁移完成。'
      })
    },

    parseMarkdownImageSources(markdown) {
      const regex = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
      const results = []
      let match = regex.exec(markdown)
      while (match) {
        results.push(match[1])
        match = regex.exec(markdown)
      }
      return [...new Set(results)]
    },

    resolveImageSourceToAbsolute(src, pathname) {
      if (!src || !pathname) return ''
      if (/^https?:\/\//i.test(src) || /^data:/i.test(src) || /^blob:/i.test(src)) return ''
      if (/^marktext-asset:\/\//.test(src)) {
        const baseDir = (window as any).__MT_ASSET_BASE_DIR || path.dirname(pathname)
        return path.join(baseDir, src.replace(/^marktext-asset:\/\//, ''))
      }
      if (path.isAbsolute(src)) return src
      return path.resolve(path.dirname(pathname), src)
    },

    async findImageInDirectoryByName(rootDir, fileName) {
      const walk = async currentDir => {
        const entries = await electronFs.readdir(currentDir, { withFileTypes: true })
        for (const entry of entries) {
          const entryPath = path.join(currentDir, entry.name)
          if (entry.isFile && entry.isFile() && entry.name === fileName) {
            return entryPath
          }
          if (entry.isDirectory && entry.isDirectory()) {
            const found = await walk(entryPath)
            if (found) return found
          }
        }
        return ''
      }
      try {
        return await walk(rootDir)
      } catch {
        return ''
      }
    },

    buildRefForFoundImage(oldSrc, foundPath, pathname) {
      if (/^marktext-asset:\/\//.test(oldSrc)) {
        const baseDir = (window as any).__MT_ASSET_BASE_DIR || path.dirname(pathname)
        const relative = this.toForwardSlashes(path.relative(baseDir, foundPath))
        return `marktext-asset://${relative}`
      }
      let relative = this.toForwardSlashes(path.relative(path.dirname(pathname), foundPath))
      if (!relative.startsWith('.')) relative = `./${relative}`
      return relative
    },

    async scanMissingImagesOnOpen() {
      if (!this.editor || !this.currentFile || !this.currentFile.pathname) return

      const pathname = this.currentFile.pathname
      const markdown = this.editor.getMarkdown() || this.currentFile.markdown || ''
      const imageSources = this.parseMarkdownImageSources(markdown)
      if (!imageSources.length) return

      const missing = []
      for (const src of imageSources) {
        const absPath = this.resolveImageSourceToAbsolute(src, pathname)
        if (!absPath) continue
        if (!(await this.pathExists(absPath))) {
          missing.push({ src, absPath, fileName: path.basename(src) })
        }
      }
      if (!missing.length) return

      const choice = window.prompt(
        `检测到 ${missing.length} 张丢失图片。\n` +
          '1=自动查找(文档目录)\n' +
          '2=指定目录自动查找\n' +
          '3=逐张手动查找\n' +
          '4=忽略',
        '1'
      )
      if (!choice || choice === '4') return

      let searchRoot = path.dirname(pathname)
      if (choice === '2') {
        const inputRoot = window.prompt('请输入要搜索的目录绝对路径：', searchRoot)
        if (!inputRoot) return
        searchRoot = inputRoot
      }

      let nextMarkdown = markdown
      for (const item of missing) {
        let foundPath = ''
        if (choice === '1' || choice === '2') {
          foundPath = await this.findImageInDirectoryByName(
            searchRoot,
            path.basename(item.fileName)
          )
        } else if (choice === '3') {
          foundPath = await this.pickImageSavePath(item.absPath)
        }
        if (!foundPath) continue
        const newRef = this.buildRefForFoundImage(item.src, foundPath, pathname)
        nextMarkdown = nextMarkdown.split(item.src).join(newRef)
      }

      if (nextMarkdown !== markdown) {
        this.suppressNextEditorChange = true
        this.editor.setMarkdown(nextMarkdown, this.currentFile.cursor, false)
        notice.notify({
          title: 'Image',
          type: 'success',
          message: '已更新缺失图片路径。'
        })
      }
    },

    handleImageActionErrorEvent(event) {
      const detail = (event && event.detail) || {}
      const type = detail.type || 'image'
      const message = detail.error || 'Unexpected error when processing image.'
      notice.notify({
        title: 'Image',
        type: 'error',
        message: `[${type}] ${message}`
      })
    },

    applyQuickInsertHintText() {
      const hintText = this.$t('editor.quickInsert.typeToInsert')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
      document.documentElement.style.setProperty('--ag-quick-insert-hint', `"${hintText}"`)
    },
    photoCreatorClick: url => {
      shell.openExternal(url)
    },

    jumpClick(linkInfo) {
      const { href } = linkInfo
      if (!href) return

      // In-document anchors (e.g. [TOC] links) should scroll locally.
      const hashIndex = href.indexOf('#')
      if (hashIndex > -1) {
        const rawSlug = href.slice(hashIndex + 1)
        const decodedSlug = decodeURIComponent(rawSlug)
        if (decodedSlug) {
          const anchor = document.getElementById(decodedSlug)
          if (anchor) {
            this.scrollToHeader(decodedSlug)
            return
          }
          const rawAnchor = document.getElementById(rawSlug)
          if (rawAnchor) {
            this.scrollToHeader(rawSlug)
            return
          }
        }
        return
      }

      useEditorStore().FORMAT_LINK_CLICK({
        data: { href },
        dirname: window.DIRNAME
      })
    },

    async imagePathAutoComplete(src) {
      const files = await useEditorStore().ASK_FOR_IMAGE_AUTO_PATH(src)
      return files.map(f => {
        const iconClass = f.type === 'directory' ? 'icon-folder' : 'icon-image'
        return Object.assign(f, {
          iconClass,
          text: f.file + (f.type === 'directory' ? '/' : '')
        })
      })
    },

    getFrontmatterAssetFolder(markdown) {
      if (typeof markdown !== 'string' || !markdown.startsWith('---')) return ''
      const match = /^---\n([\s\S]*?)\n---/.exec(markdown)
      if (!match || !match[1]) return ''
      const line = match[1].split('\n').find(item => /^\s*marktext-assets\s*:/i.test(item))
      if (!line) return ''
      const value = line
        .replace(/^\s*marktext-assets\s*:\s*/i, '')
        .trim()
        .replace(/^['"]|['"]$/g, '')
      return value || 'images'
    },

    toForwardSlashes(filePath) {
      return typeof filePath === 'string' ? filePath.replace(/\\/g, '/') : filePath
    },

    async pathExists(filePath) {
      try {
        await electronFs.access(filePath)
        return true
      } catch {
        return false
      }
    },

    async readFileAsBinaryString(file) {
      return new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onload = () => resolve(fileReader.result)
        fileReader.onerror = () => reject(new Error('Failed to read image binary data'))
        fileReader.readAsBinaryString(file)
      })
    },

    async pickImageSavePath(defaultPath) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const selected = await invoke('save_file_dialog', {
          defaultPath: path.dirname(defaultPath),
          filename: path.basename(defaultPath)
        })
        return selected || ''
      } catch {
        return ''
      }
    },

    async resolveImageNameConflict(targetPath, context) {
      let resolvedPath = targetPath
      while (await this.pathExists(resolvedPath)) {
        const filename = path.basename(resolvedPath)
        const choice = window.prompt(
          `图片名称冲突：${filename}\n` +
            '1=替换旧图片\n' +
            '2=修改旧图片(移动/改名原文件)\n' +
            '3=修改新图片(改本次保存位置/名称)\n' +
            '4=取消粘贴',
          '1'
        )

        if (!choice || choice === '4') {
          return ''
        }

        if (choice === '1') {
          return resolvedPath
        }

        if (choice === '2') {
          const newOldPath = await this.pickImageSavePath(resolvedPath)
          if (!newOldPath) continue
          await electronFs.mkdir(path.dirname(newOldPath), { recursive: true })
          await electronFs.rename(resolvedPath, newOldPath)

          const oldRef = this.buildImageReference(resolvedPath, context)
          const newRef = this.buildImageReference(newOldPath, context)
          if (oldRef && newRef && oldRef !== newRef && this.editor) {
            const markdown = this.editor.getMarkdown()
            if (typeof markdown === 'string' && markdown.includes(oldRef)) {
              const nextMarkdown = markdown.split(oldRef).join(newRef)
              this.suppressNextEditorChange = true
              this.editor.setMarkdown(nextMarkdown, this.currentFile.cursor, false)
            }
          }
          continue
        }

        if (choice === '3') {
          const newTargetPath = await this.pickImageSavePath(resolvedPath)
          if (!newTargetPath) continue
          resolvedPath = newTargetPath
          continue
        }
      }
      return resolvedPath
    },

    buildImageReference(destAbsPath, context) {
      const normalized = this.toForwardSlashes(destAbsPath)
      if (context.mode === 'local' && context.docDir) {
        let relative = this.toForwardSlashes(path.relative(context.docDir, normalized))
        if (!relative.startsWith('.')) relative = `./${relative}`
        return relative
      }
      if (context.mode === 'global' && context.globalRoot) {
        const relative = this.toForwardSlashes(path.relative(context.globalRoot, normalized))
        return `marktext-asset://${relative}`
      }
      return normalized
    },

    async saveImageToPath(image, targetPath, pathname) {
      await electronFs.mkdir(path.dirname(targetPath), { recursive: true })
      if (typeof image === 'string') {
        const basePath = pathname ? path.dirname(pathname) : ''
        const sourcePath = path.isAbsolute(image) ? image : path.resolve(basePath, image)
        if (sourcePath !== targetPath) {
          try {
            await electronFs.rm(targetPath, { force: true })
          } catch {
            // Ignore remove errors; copy operation may still succeed.
          }
          await electronFs.copyFile(sourcePath, targetPath)
        }
      } else {
        const binary = await this.readFileAsBinaryString(image)
        await electronFs.writeFile(targetPath, binary, { encoding: 'binary' })
      }
    },

    updateAssetBaseDir() {
      const { pathname = '', markdown = '', filename = '' } = this.currentFile || {}
      const localAssetFolder = this.getFrontmatterAssetFolder(markdown)
      if (localAssetFolder && pathname) {
        ;(window as any).__MT_ASSET_BASE_DIR = path.join(path.dirname(pathname), localAssetFolder)
        return
      }
      if (this.imageFolderPath && filename) {
        const docName = filename.replace(/\.[^/.]+$/, '') || 'untitled'
        ;(window as any).__MT_ASSET_BASE_DIR = this.imageFolderPath
        ;(window as any).__MT_ASSET_DOC_NAME = docName
        return
      }
      ;(window as any).__MT_ASSET_BASE_DIR = pathname ? path.dirname(pathname) : ''
    },

    async imageAction(image, id, alt = '') {
      const {
        imageInsertAction,
        imageFolderPath,
        imagePreferRelativeDirectory,
        imageRelativeDirectoryName,
        preferences
      } = this
      const { filename, pathname, markdown = '' } = this.currentFile
      const docName = (filename || 'untitled').replace(/\.[^/.]+$/, '') || 'untitled'
      const localAssetFolder = this.getFrontmatterAssetFolder(markdown)

      if (localAssetFolder && !pathname) {
        notice.notify({
          title: 'Image',
          type: 'warning',
          message: '启用本地资产前需要先保存文档。'
        })
        ipcRenderer.emit('mt::editor-ask-file-save', null)
        throw new Error('Document must be saved before using local assets.')
      }

      // Save an image relative to the file if the relative image directory include the filename variable.
      // The image is save relative to the root folder without a variable.
      const saveRelativeToFile = () => {
        return /\${filename}/.test(imageRelativeDirectoryName)
      }

      // Figure out the current working directory.
      const isTabSavedOnDisk = !!pathname
      let relativeBasePath = isTabSavedOnDisk ? path.dirname(pathname) : null
      if (isTabSavedOnDisk && !saveRelativeToFile() && this.projectTree) {
        const { pathname: rootPath } = this.projectTree
        if (rootPath && isChildOfDirectory(rootPath, pathname)) {
          // Save assets relative to root directory.
          relativeBasePath = rootPath
        }
      }

      const getResolvedImagePath = imagePath => {
        // Filename w/o extension
        const replacement = isTabSavedOnDisk ? filename.replace(/\.[^/.]+$/, '') : ''
        return imagePath.replace(/\${filename}/g, replacement)
      }

      const resolvedImageFolderPath = getResolvedImagePath(imageFolderPath)
      const resolvedImageRelativeDirectoryName = getResolvedImagePath(imageRelativeDirectoryName)
      let destImagePath = ''

      const context = {
        mode: 'legacy',
        docDir: pathname ? path.dirname(pathname) : '',
        globalRoot: resolvedImageFolderPath,
        localFolder: localAssetFolder,
        docName
      }

      const saveWithAssetMode = async targetDir => {
        const sourceName =
          typeof image === 'string' ? path.basename(image) : image.name || 'image.png'
        let targetPath = path.join(targetDir, sourceName)
        targetPath = await this.resolveImageNameConflict(targetPath, context)
        if (!targetPath) {
          throw new Error('Image paste cancelled by user.')
        }
        await this.saveImageToPath(image, targetPath, pathname)
        return targetPath
      }

      switch (imageInsertAction) {
        case 'upload': {
          try {
            destImagePath = await uploadImage(pathname, image, preferences)
          } catch (err) {
            notice.notify({
              title: 'Upload Image',
              type: 'warning',
              message: err
            })
            destImagePath = await moveImageToFolder(pathname, image, resolvedImageFolderPath)
          }
          break
        }
        case 'folder': {
          if (localAssetFolder && pathname) {
            context.mode = 'local'
            const localDir = path.join(path.dirname(pathname), localAssetFolder)
            destImagePath = this.buildImageReference(await saveWithAssetMode(localDir), context)
            ;(window as any).__MT_ASSET_BASE_DIR = localDir
          } else if (resolvedImageFolderPath && pathname) {
            context.mode = 'global'
            const globalDir = path.join(resolvedImageFolderPath, docName)
            destImagePath = this.buildImageReference(await saveWithAssetMode(globalDir), context)
            ;(window as any).__MT_ASSET_BASE_DIR = resolvedImageFolderPath
          } else {
            destImagePath = await moveImageToFolder(pathname, image, resolvedImageFolderPath)
            if (isTabSavedOnDisk && imagePreferRelativeDirectory) {
              destImagePath = await moveToRelativeFolder(
                relativeBasePath,
                resolvedImageRelativeDirectoryName,
                pathname,
                destImagePath
              )
            }
          }
          break
        }
        case 'path': {
          if (localAssetFolder && pathname) {
            context.mode = 'local'
            const localDir = path.join(path.dirname(pathname), localAssetFolder)
            destImagePath = this.buildImageReference(await saveWithAssetMode(localDir), context)
            ;(window as any).__MT_ASSET_BASE_DIR = localDir
          } else if (resolvedImageFolderPath && pathname) {
            context.mode = 'global'
            const globalDir = path.join(resolvedImageFolderPath, docName)
            destImagePath = this.buildImageReference(await saveWithAssetMode(globalDir), context)
            ;(window as any).__MT_ASSET_BASE_DIR = resolvedImageFolderPath
          } else if (typeof image === 'string') {
            destImagePath = image
          } else {
            destImagePath = await moveImageToFolder(pathname, image, resolvedImageFolderPath)
            if (isTabSavedOnDisk && imagePreferRelativeDirectory) {
              destImagePath = await moveToRelativeFolder(
                relativeBasePath,
                resolvedImageRelativeDirectoryName,
                pathname,
                destImagePath
              )
            }
          }
          break
        }
      }

      if (id && this.sourceCode) {
        bus.$emit('image-action', {
          id,
          result: destImagePath,
          alt
        })
      }
      return destImagePath
    },

    imagePathPicker() {
      return useEditorStore().ASK_FOR_IMAGE_PATH()
    },

    keyup(event) {
      if (event.key === 'Escape') {
        this.setImageViewerVisible(false)
      }
    },

    setImageViewerVisible(status) {
      this.imageViewerVisible = status
    },

    switchSpellcheckLanguage(languageCode) {
      const { spellchecker } = this
      const { isEnabled } = spellchecker

      // This method is also called from bus, so validate state before continuing.
      if (!isEnabled) {
        throw new Error('Cannot switch language because spell checker is disabled!')
      }

      spellchecker
        .switchLanguage(languageCode)
        .then(langCode => {
          if (!langCode) {
            // Unable to switch language due to missing dictionary. The spell checker is now in an invalid state.
            notice.notify({
              title: 'Spelling',
              type: 'warning',
              message: `Unable to switch to language "${languageCode}". Requested language dictionary is missing.`
            })
          }
        })
        .catch(error => {
          log.error(`Error while switching to language "${languageCode}":`)
          log.error(error)

          notice.notify({
            title: 'Spelling',
            type: 'error',
            message: `Error while switching to "${languageCode}": ${error.message}`
          })
        })
    },

    handleInvalidateImageCache() {
      if (this.editor) {
        this.editor.invalidateImageCache()
      }
    },

    openSpellcheckerLanguageCommand() {
      if (!isOsx) {
        bus.$emit('show-command-palette', this.switchLanguageCommand)
      }
    },

    replaceMisspelling({ word, replacement }) {
      if (this.editor?.replaceMisspelling) {
        this.editor.replaceMisspelling(word, replacement)
      }
    },

    handleUndo() {
      if (this.editor) {
        this.editor.undo()
      }
    },

    handleRedo() {
      if (this.editor) {
        this.editor.redo()
      }
    },

    handleSelectAll() {
      if (this.sourceCode) {
        return
      }

      if (this.editor && (this.editor.hasFocus() || this.editor.hasSelectionInTable())) {
        this.editor.selectAll()
      } else {
        const activeElement = document.activeElement
        const nodeName = activeElement.nodeName
        if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
          activeElement.select()
        }
      }
    },

    handleEditorContextAction(action) {
      switch (action) {
        case 'cut':
          document.execCommand('cut')
          break
        case 'copy':
          document.execCommand('copy')
          break
        case 'paste':
          document.execCommand('paste')
          break
        case 'copyAsMarkdown':
          bus.$emit('copyAsMarkdown')
          break
        case 'copyAsHtml':
          bus.$emit('copyAsHtml')
          break
        case 'selectAll':
          this.handleSelectAll()
          break
        case 'openLink':
          if (this.editorContextState.linkHref) {
            shell.openExternal(this.editorContextState.linkHref)
          }
          break
        case 'copyLink':
          if (this.editorContextState.linkHref) {
            navigator.clipboard?.writeText(this.editorContextState.linkHref)
          }
          break
        case 'copyImage':
          this.copyImageFromContext()
          break
        case 'saveImageAs':
          this.saveImageFromContext()
          break
        default:
          break
      }
    },

    updateEditorContextState(event, sectionChanges) {
      const hasSelection = !!(
        sectionChanges &&
        sectionChanges.start &&
        sectionChanges.end &&
        (sectionChanges.start.key !== sectionChanges.end.key ||
          sectionChanges.start.offset !== sectionChanges.end.offset)
      )
      const target = event?.target
      const linkElement = target?.closest ? target.closest('a') : null
      const imageWrapper = target?.closest ? target.closest('.ag-inline-image') : null
      const imageElement = imageWrapper?.querySelector?.('img')
      this.editorContextState = {
        hasSelection,
        isLink: !!linkElement,
        isImage: !!imageElement,
        linkHref: linkElement?.getAttribute?.('href') || '',
        imageSrc: imageElement?.getAttribute?.('src') || ''
      }
    },

    async copyImageFromContext() {
      const src = this.editorContextState.imageSrc
      if (!src) return
      try {
        const response = await fetch(src)
        const blob = await response.blob()
        const ClipboardItemCtor = (window as any).ClipboardItem
        if (ClipboardItemCtor && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })])
          return
        }
      } catch {
        // Fallback to copying source URL/path as text.
      }
      navigator.clipboard?.writeText(src)
    },

    saveImageFromContext() {
      const src = this.editorContextState.imageSrc
      if (!src) return
      if (/^https?:\/\//i.test(src) || /^data:/i.test(src) || /^blob:/i.test(src)) {
        const link = document.createElement('a')
        link.href = src
        link.download = 'image'
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        shell.openPath(src)
      }
    },

    // Custom copyAsMarkdown copyAsHtml pasteAsPlainText
    handleCopyPaste(type) {
      if (this.editor) {
        this.editor[type]()
      }
    },

    insertImage(src) {
      if (!this.sourceCode) {
        this.editor && this.editor.insertImage({ src })
      }
    },

    handleSearch(value, opt) {
      const searchMatches = this.editor.search(value, opt)
      useEditorStore().SEARCH(searchMatches)
      this.scrollToHighlight()
    },

    handReplace(value, opt) {
      const searchMatches = this.editor.replace(value, opt)
      useEditorStore().SEARCH(searchMatches)
    },

    handleUploadedImage(url, deletionUrl) {
      this.insertImage(url)
      useEditorStore().SHOW_IMAGE_DELETION_URL(deletionUrl)
    },

    scrollToCursor(duration = 300) {
      this.$nextTick(() => {
        const { container } = this.editor
        const { y } = this.editor.getSelection().cursorCoords
        animatedScrollTo(container, container.scrollTop + y - STANDAR_Y, duration)
      })
    },

    scrollToHighlight() {
      return this.scrollToElement('.ag-highlight')
    },

    scrollToHeader(slug) {
      return this.scrollToElement(`#${slug}`)
    },

    scrollToElement(selector) {
      // Scroll to search highlight word
      const { container } = this.editor
      const anchor = document.querySelector(selector)
      if (anchor) {
        const { y } = anchor.getBoundingClientRect()
        const DURATION = 300
        animatedScrollTo(container, container.scrollTop + y - STANDAR_Y, DURATION)
      }
    },

    handleFindAction(action) {
      const searchMatches = this.editor.find(action)
      useEditorStore().SEARCH(searchMatches)
      this.scrollToHighlight()
    },

    async handleExport(options) {
      const { type, header, footer, headerFooterStyled, htmlTitle } = options

      if (!/^pdf|print|styledHtml$/.test(type)) {
        throw new Error(`Invalid type to export: "${type}".`)
      }

      const extraCss = getCssForOptions(options)
      const htmlToc = getHtmlToc(this.editor.getTOC(), options)

      switch (type) {
        case 'styledHtml': {
          try {
            const content = await this.editor.exportStyledHTML({
              title: htmlTitle || '',
              printOptimization: false,
              extraCss,
              toc: htmlToc
            })
            useEditorStore().EXPORT({ type, content })
          } catch (err) {
            log.error('Failed to export document:', err)
            notice.notify({
              title: `Printing/Exporting ${htmlTitle || 'html'} failed`,
              type: 'error',
              message: err.message || 'There is something wrong when exporting.'
            })
          }
          break
        }
        case 'pdf': {
          // NOTE: We need to set page size via Electron.
          try {
            const { pageSize, pageSizeWidth, pageSizeHeight, isLandscape } = options
            const pageOptions = {
              pageSize,
              pageSizeWidth,
              pageSizeHeight,
              isLandscape
            }

            const html = await this.editor.exportStyledHTML({
              title: '',
              printOptimization: true,
              extraCss,
              toc: htmlToc,
              header,
              footer,
              headerFooterStyled
            })
            this.printer.renderMarkdown(html, true)
            useEditorStore().EXPORT({ type, pageOptions })
          } catch (err) {
            log.error('Failed to export document:', err)
            notice.notify({
              title: 'Printing/Exporting failed',
              type: 'error',
              message: `There is something wrong when export ${htmlTitle || 'PDF'}.`
            })
            this.handlePrintServiceClearup()
          }
          break
        }
        case 'print': {
          // NOTE: Print doesn't support page size or orientation.
          try {
            const html = await this.editor.exportStyledHTML({
              title: '',
              printOptimization: true,
              extraCss,
              toc: htmlToc,
              header,
              footer,
              headerFooterStyled
            })
            this.printer.renderMarkdown(html, true)
            useEditorStore().PRINT_RESPONSE()
          } catch (err) {
            log.error('Failed to export document:', err)
            notice.notify({
              title: 'Printing/Exporting failed',
              type: 'error',
              message: `There is something wrong when print ${htmlTitle || ''}.`
            })
            this.handlePrintServiceClearup()
          }
          break
        }
      }
    },

    handlePrintServiceClearup() {
      this.printer.clearup()
    },

    handleEditParagraph(type) {
      if (type === 'table') {
        this.tableChecker = { rows: 4, columns: 3 }
        this.dialogTableVisible = true
        this.$nextTick(() => {
          this.$refs.rowInput.focus()
        })
      } else if (this.editor) {
        this.editor.updateParagraph(type)
      }
    },

    // handle `duplicate`, `delete`, `create paragraph below`
    handleParagraph(type) {
      const { editor } = this
      if (editor) {
        switch (type) {
          case 'duplicate': {
            return editor.duplicate()
          }
          case 'createParagraph': {
            return editor.insertParagraph('after', '', true)
          }
          case 'deleteParagraph': {
            return editor.deleteParagraph()
          }
          default:
            console.error(`unknow paragraph edit type: ${type}`)
        }
      }
    },

    handleInlineFormat(type) {
      this.editor && this.editor.format(type)
    },

    handleDialogTableConfirm() {
      this.dialogTableVisible = false
      this.editor && this.editor.createTable(this.tableChecker)
    },

    // listen for `open-single-file` event, it will call this method only when open a new file.
    setMarkdownToEditor({ markdown, cursor }) {
      const { editor } = this
      if (editor) {
        this.suppressNextEditorChange = true
        editor.clearHistory()
        if (cursor) {
          editor.setMarkdown(markdown, cursor, true)
        } else {
          editor.setMarkdown(markdown)
        }
      }
    },

    // listen for markdown change form source mode or change tabs etc
    handleFileChange({ markdown, cursor, renderCursor, history }) {
      const { editor } = this
      this.$nextTick(() => {
        if (editor) {
          if (history) {
            editor.setHistory(history)
          }
          if (typeof markdown === 'string') {
            this.suppressNextEditorChange = true
            editor.setMarkdown(markdown, cursor, renderCursor)
          } else if (cursor) {
            editor.setCursor(cursor)
          }
          if (renderCursor) {
            this.scrollToCursor(0)
          }
        }
      })
    },

    handleInsertParagraph(location) {
      const { editor } = this
      editor && editor.insertParagraph(location)
    },

    blurEditor() {
      this.editor.blur(false, true)
    },

    focusEditor() {
      this.editor.focus()
    },

    handleScreenShot() {
      if (this.editor) {
        document.execCommand('paste')
      }
    }
  }
}
</script>

<style>
.editor-wrapper {
  height: 100%;
  position: relative;
  flex: 1;
  color: var(--editorColor);
  & .app-dialog-body {
    & .form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
    }
    & .form-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    & .form-item label {
      font-size: 13px;
      color: var(--editorColor);
    }
    & .input-number {
      width: 80px;
      height: 30px;
      border: 1px solid var(--floatBorderColor);
      background: var(--inputBgColor);
      color: var(--editorColor);
      border-radius: 4px;
      padding: 0 8px;
      font-size: 13px;
    }
    & .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    & .btn-default,
    & .btn-primary {
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    & .btn-default {
      background: transparent;
      border: 1px solid var(--floatBorderColor);
      color: var(--editorColor);
    }
    & .btn-primary {
      background: var(--themeColor);
      color: #fff;
      border: none;
    }
  }
}

.editor-wrapper.source {
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  overflow: hidden;
}

.editor-component {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  cursor: default;
}

.editor-context-trigger {
  height: 100%;
}

/* Milkdown / ProseMirror: ensure editor is visible and editable */
.editor-component .milkdown {
  height: 100%;
  min-height: 100%;
}
.editor-component .ProseMirror {
  outline: none;
  min-height: 100%;
  padding: 1em;
  box-sizing: border-box;
}
.editor-component .ProseMirror:focus {
  outline: none;
}

.typewriter .editor-component {
  padding-top: calc(50vh - 136px);
  padding-bottom: calc(50vh - 54px);
}
</style>
