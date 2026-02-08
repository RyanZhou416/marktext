import paragraphIcon from '../../assets/pngicon/paragraph/2.png'
import htmlIcon from '../../assets/pngicon/html/2.png'
import hrIcon from '../../assets/pngicon/horizontal_line/2.png'
import frontMatterIcon from '../../assets/pngicon/front_matter/2.png'
import header1Icon from '../../assets/pngicon/heading_1/2.png'
import header2Icon from '../../assets/pngicon/heading_2/2.png'
import header3Icon from '../../assets/pngicon/heading_3/2.png'
import header4Icon from '../../assets/pngicon/heading_4/2.png'
import header5Icon from '../../assets/pngicon/heading_5/2.png'
import header6Icon from '../../assets/pngicon/heading_6/2.png'
import newTableIcon from '../../assets/pngicon/new_table/2.png'
import bulletListIcon from '../../assets/pngicon/bullet_list/2.png'
import codeIcon from '../../assets/pngicon/code/2.png'
import quoteIcon from '../../assets/pngicon/quote_block/2.png'
import todoListIcon from '../../assets/pngicon/todolist/2.png'
import mathblockIcon from '../../assets/pngicon/math/2.png'
import orderListIcon from '../../assets/pngicon/order_list/2.png'
import flowchartIcon from '../../assets/pngicon/flowchart/2.png'
import sequenceIcon from '../../assets/pngicon/sequence/2.png'
import plantumlIcon from '../../assets/pngicon/plantuml/2.png'
import mermaidIcon from '../../assets/pngicon/mermaid/2.png'
import vegaIcon from '../../assets/pngicon/chart/2.png'
import { isOsx } from '../../config'

const COMMAND_KEY = isOsx ? '⌘' : 'Ctrl'
const OPTION_KEY = isOsx ? '⌥' : 'Alt'
const SHIFT_KEY = isOsx ? '⇧' : 'Shift'

// Command (or Cmd) ⌘
// Shift ⇧
// Option (or Alt) ⌥
// Control (or Ctrl) ⌃
// Caps Lock ⇪
// Fn

// Translation function - injected from outside, defaults to identity
let _t = (key) => key

export const setTranslator = (t) => {
  _t = t
}

export const getQuickInsertObj = () => ({
  [_t('editor.quickInsert.basicBlock')]: [{
    title: _t('editor.quickInsert.paragraph'),
    subTitle: 'Lorem Ipsum is simply dummy text',
    label: 'paragraph',
    shortCut: `${COMMAND_KEY}+0`,
    icon: paragraphIcon
  }, {
    title: _t('editor.quickInsert.horizontalLine'),
    subTitle: '---',
    label: 'hr',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+-`,
    icon: hrIcon
  }, {
    title: _t('editor.quickInsert.frontMatter'),
    subTitle: '--- Lorem Ipsum ---',
    label: 'front-matter',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+Y`,
    icon: frontMatterIcon
  }],
  [_t('editor.quickInsert.header')]: [{
    title: _t('editor.quickInsert.header1'),
    subTitle: '# Lorem Ipsum is simply ...',
    label: 'heading 1',
    shortCut: `${COMMAND_KEY}+1`,
    icon: header1Icon
  }, {
    title: _t('editor.quickInsert.header2'),
    subTitle: '## Lorem Ipsum is simply ...',
    label: 'heading 2',
    shortCut: `${COMMAND_KEY}+2`,
    icon: header2Icon
  }, {
    title: _t('editor.quickInsert.header3'),
    subTitle: '### Lorem Ipsum is simply ...',
    label: 'heading 3',
    shortCut: `${COMMAND_KEY}+3`,
    icon: header3Icon
  }, {
    title: _t('editor.quickInsert.header4'),
    subTitle: '#### Lorem Ipsum is simply ...',
    label: 'heading 4',
    shortCut: `${COMMAND_KEY}+4`,
    icon: header4Icon
  }, {
    title: _t('editor.quickInsert.header5'),
    subTitle: '##### Lorem Ipsum is simply ...',
    label: 'heading 5',
    shortCut: `${COMMAND_KEY}+5`,
    icon: header5Icon
  }, {
    title: _t('editor.quickInsert.header6'),
    subTitle: '###### Lorem Ipsum is simply ...',
    label: 'heading 6',
    shortCut: `${COMMAND_KEY}+6`,
    icon: header6Icon
  }],
  [_t('editor.quickInsert.advancedBlock')]: [{
    title: _t('editor.quickInsert.tableBlock'),
    subTitle: '|Lorem | Ipsum is simply |',
    label: 'table',
    shortCut: `${SHIFT_KEY}+${COMMAND_KEY}+T`,
    icon: newTableIcon
  }, {
    title: _t('editor.quickInsert.displayMath'),
    subTitle: '$$ Lorem Ipsum is simply $$',
    label: 'mathblock',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+M`,
    icon: mathblockIcon
  }, {
    title: _t('editor.quickInsert.htmlBlock'),
    subTitle: '<div> Lorem Ipsum is simply </div>',
    label: 'html',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+J`,
    icon: htmlIcon
  }, {
    title: _t('editor.quickInsert.codeBlock'),
    subTitle: '```java Lorem Ipsum is simply ```',
    label: 'pre',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+C`,
    icon: codeIcon
  }, {
    title: _t('editor.quickInsert.quoteBlock'),
    subTitle: '>Lorem Ipsum is simply ...',
    label: 'blockquote',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+Q`,
    icon: quoteIcon
  }],
  [_t('editor.quickInsert.listBlock')]: [{
    title: _t('editor.quickInsert.orderList'),
    subTitle: '1. Lorem Ipsum is simply ...',
    label: 'ol-order',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+O`,
    icon: orderListIcon
  }, {
    title: _t('editor.quickInsert.bulletList'),
    subTitle: '- Lorem Ipsum is simply ...',
    label: 'ul-bullet',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+U`,
    icon: bulletListIcon
  }, {
    title: _t('editor.quickInsert.todoList'),
    subTitle: '- [x] Lorem Ipsum is simply ...',
    label: 'ul-task',
    shortCut: `${OPTION_KEY}+${COMMAND_KEY}+X`,
    icon: todoListIcon
  }],
  [_t('editor.quickInsert.diagram')]: [{
    title: _t('editor.quickInsert.vegaChart'),
    subTitle: 'Render flow chart by vega-lite.js.',
    label: 'vega-lite',
    icon: vegaIcon
  }, {
    title: _t('editor.quickInsert.flowChart'),
    subTitle: 'Render flow chart by flowchart.js.',
    label: 'flowchart',
    icon: flowchartIcon
  }, {
    title: _t('editor.quickInsert.sequenceDiagram'),
    subTitle: 'Render sequence diagram by js-sequence.',
    label: 'sequence',
    icon: sequenceIcon
  }, {
    title: _t('editor.quickInsert.plantUml'),
    subTitle: 'Render PlantUML diagrams',
    label: 'plantuml',
    icon: plantumlIcon
  }, {
    title: _t('editor.quickInsert.mermaid'),
    subTitle: 'Render Diagram by mermaid.',
    label: 'mermaid',
    icon: mermaidIcon
  }]
})

// Keep backward-compatible static export (uses current _t)
export const quickInsertObj = new Proxy({}, {
  get (target, prop) {
    return getQuickInsertObj()[prop]
  },
  ownKeys () {
    return Object.keys(getQuickInsertObj())
  },
  getOwnPropertyDescriptor (target, prop) {
    const obj = getQuickInsertObj()
    if (prop in obj) {
      return { configurable: true, enumerable: true, value: obj[prop] }
    }
    return undefined
  },
  has (target, prop) {
    return prop in getQuickInsertObj()
  }
})
