<template>
  <AppDialog
    :open="dialog.open"
    :title="$t('dialog.externalConflictTitle')"
    width="860px"
    @update:open="onOpenChange"
  >
    <div class="conflict-message">
      {{ $t('dialog.externalConflictMessage') }}
    </div>
    <div class="columns">
      <div class="column">
        <div class="column-title">{{ $t('dialog.externalConflictOurs') }}</div>
        <pre class="content">{{ dialog.ours }}</pre>
      </div>
      <div class="column">
        <div class="column-title">{{ $t('dialog.externalConflictTheirs') }}</div>
        <pre class="content">{{ dialog.theirs }}</pre>
      </div>
    </div>
    <div class="actions">
      <button class="btn" @click="choose('ours')">{{ $t('dialog.keepMine') }}</button>
      <button class="btn" @click="choose('theirs')">{{ $t('dialog.useExternal') }}</button>
      <button class="btn primary" @click="choose('manual')">
        {{ $t('dialog.useMergedDraft') }}
      </button>
    </div>
  </AppDialog>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import AppDialog from '@/components/common/AppDialog.vue'

export default {
  components: {
    AppDialog
  },
  computed: {
    ...mapState(useEditorStore, ['externalConflictDialog']),
    dialog() {
      return this.externalConflictDialog || { open: false }
    }
  },
  methods: {
    onOpenChange(open: boolean) {
      if (!open) {
        useEditorStore().SET_EXTERNAL_CONFLICT_DIALOG({ open: false })
      }
    },
    choose(strategy: 'ours' | 'theirs' | 'manual') {
      const { tabId, merged } = this.dialog
      useEditorStore().APPLY_EXTERNAL_CONFLICT_DECISION({ tabId, strategy, text: merged })
    }
  }
}
</script>

<style scoped>
.conflict-message {
  margin-bottom: 12px;
  color: var(--editorColor70);
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.column {
  border: 1px solid var(--floatBorderColor);
  border-radius: 6px;
  overflow: hidden;
}

.column-title {
  padding: 8px 10px;
  background: var(--editorColor04);
  font-weight: 600;
}

.content {
  margin: 0;
  padding: 10px;
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--codeFontFamily);
  font-size: 12px;
}

.actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  border: 1px solid var(--floatBorderColor);
  background: var(--editorColor04);
  color: var(--editorColor);
  border-radius: 6px;
  padding: 7px 12px;
  cursor: pointer;
}

.btn.primary {
  background: var(--themeColor);
  color: #fff;
  border-color: transparent;
}
</style>
