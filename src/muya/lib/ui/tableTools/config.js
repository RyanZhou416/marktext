// Translation function - injected from outside, defaults to identity
let _t = key => key

export const setTableToolsTranslator = t => {
  _t = t
}

export const getToolList = () => ({
  left: [
    {
      label: _t('editor.tableTools.insertRowAbove'),
      action: 'insert',
      location: 'previous',
      target: 'row'
    },
    {
      label: _t('editor.tableTools.insertRowBelow'),
      action: 'insert',
      location: 'next',
      target: 'row'
    },
    {
      label: _t('editor.tableTools.removeRow'),
      action: 'remove',
      location: 'current',
      target: 'row'
    }
  ],
  bottom: [
    {
      label: _t('editor.tableTools.insertColumnLeft'),
      action: 'insert',
      location: 'left',
      target: 'column'
    },
    {
      label: _t('editor.tableTools.insertColumnRight'),
      action: 'insert',
      location: 'right',
      target: 'column'
    },
    {
      label: _t('editor.tableTools.removeColumn'),
      action: 'remove',
      location: 'current',
      target: 'column'
    }
  ]
})

export const toolList = getToolList()
