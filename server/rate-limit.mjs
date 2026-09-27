export function createRateLimiter({ now = Date.now, perTenMinutes = 8, perDay = 40, globalPerHour = 300 } = {}) {
  const clients = new Map()
  const global = []
  const tenMinutes = 10 * 60 * 1000
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * 60 * 60 * 1000

  return function consume(clientKey) {
    const timestamp = now()
    while (global.length && global[0] <= timestamp - oneHour) global.shift()
    if (global.length >= globalPerHour) return { allowed: false, retryAfter: Math.ceil((global[0] + oneHour - timestamp) / 1000) }

    const recent = (clients.get(clientKey) ?? []).filter((item) => item > timestamp - oneDay)
    const tenMinuteCount = recent.filter((item) => item > timestamp - tenMinutes).length
    if (recent.length >= perDay || tenMinuteCount >= perTenMinutes) {
      clients.set(clientKey, recent)
      const oldest = recent.length >= perDay ? recent[0] : recent.find((item) => item > timestamp - tenMinutes)
      const window = recent.length >= perDay ? oneDay : tenMinutes
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((oldest + window - timestamp) / 1000)) }
    }

    recent.push(timestamp)
    clients.set(clientKey, recent)
    global.push(timestamp)
    if (clients.size > 5_000) {
      for (const [key, values] of clients) {
        if (!values.length || values.at(-1) <= timestamp - oneDay) clients.delete(key)
      }
    }
    return { allowed: true }
  }
}
