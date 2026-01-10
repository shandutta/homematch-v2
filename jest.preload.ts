import fetch from 'node-fetch'

const defineGlobalValue = <K extends keyof typeof global>(
  key: K,
  value: (typeof global)[K]
) => {
  const descriptor = Object.getOwnPropertyDescriptor(global, key)
  if (!descriptor || descriptor.configurable) {
    Object.defineProperty(global, key, {
      value,
      writable: true,
      configurable: true,
    })
  }
}

defineGlobalValue('fetch', global.fetch ?? fetch)
defineGlobalValue('Request', global.Request ?? fetch.Request)
defineGlobalValue('Response', global.Response ?? fetch.Response)
defineGlobalValue('Headers', global.Headers ?? fetch.Headers)
