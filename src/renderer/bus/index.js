import mitt from 'mitt'

// Create mitt event emitter instance
const emitter = mitt()

// Vue 2 Event Bus 兼容性包装器
// 保持 $on, $off, $emit 的 API 兼容性
const bus = {
  $on: emitter.on,
  $off: emitter.off,
  $emit: emitter.emit,
  // mitt 不支持 $once，手动实现
  $once(event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args)
      emitter.off(event, wrappedHandler)
    }
    emitter.on(event, wrappedHandler)
  },
  // 暴露原始 mitt 实例以便需要时使用
  _emitter: emitter
}

export default bus
