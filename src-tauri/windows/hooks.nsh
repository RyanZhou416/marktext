!macro NSIS_HOOK_POSTUNINSTALL
  MessageBox MB_ICONQUESTION|MB_YESNO "Remove current user's MarkText data files (preferences, recent files, caches)?" IDNO cleanup_done

  ; Legacy and current candidate locations (current user only).
  RMDir /r "$APPDATA\marktext"
  RMDir /r "$APPDATA\MarkText"
  RMDir /r "$APPDATA\com.github.marktext"
  RMDir /r "$LOCALAPPDATA\marktext"
  RMDir /r "$LOCALAPPDATA\MarkText"
  RMDir /r "$LOCALAPPDATA\com.github.marktext"
cleanup_done:
!macroend
