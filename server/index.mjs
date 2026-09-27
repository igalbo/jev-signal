import 'dotenv/config'
import crypto from 'node:crypto'
import path from 'node:path'
import express from 'express'
import { DIMENSIONS, MAX_PARAGRAPHS, MAX_TEXT_CHARS, scoreParagraphs, splitParagraphs } from './scoring.mjs'
import { createRateLimiter } from './rate-limit.mjs'

const app = express()
const port = Number(process.env.PORT || 8787)
const apiKey = process.env.JEV_API_KEY || process.env.TYPESAFE_API_KEY
const consumeRate = createRateLimiter()
let inFlight = 0
const maxConcurrent = Number(process.env.MAX_CONCURRENT_ANALYSES || 4)

app.disable('x-powered-by')
app.set('trust proxy', 1) // One Caddy hop; Compose keeps the app off public host ports.
app.use(express.json({ limit: '34kb' }))

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ ok: true, configured: Boolean(apiKey) })
})

app.post('/api/analyze', async (req, res) => {
  res.set('Cache-Control', 'no-store')
  if (!apiKey) return res.status(503).json({ error: 'Analysis is not configured yet.' })
  const text = req.body?.text
  if (typeof text !== 'string') return res.status(400).json({ error: 'Paste text to analyze.' })
  if (text.length > MAX_TEXT_CHARS) return res.status(413).json({ error: `Keep text at or below ${MAX_TEXT_CHARS.toLocaleString()} characters.` })
  if (text.trim().length < 50) return res.status(400).json({ error: 'Add at least 50 characters so the signals have enough context.' })

  let paragraphs
  try {
    paragraphs = splitParagraphs(text)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
  if (!paragraphs.length) return res.status(400).json({ error: 'Paste text to analyze.' })

  const clientHash = crypto.createHash('sha256').update(`${process.env.RATE_LIMIT_SALT || 'local-development'}:${req.ip || req.socket.remoteAddress || 'unknown'}`).digest('hex')
  const limit = consumeRate(clientHash)
  if (!limit.allowed) {
    res.set('Retry-After', String(limit.retryAfter))
    return res.status(429).json({ error: 'You have reached the analysis limit. Please try again later.' })
  }
  if (inFlight >= maxConcurrent) return res.status(503).json({ error: 'The analyzer is busy. Try again in a moment.' })

  inFlight += 1
  try {
    const analysis = await scoreParagraphs(paragraphs, apiKey)
    const dimensionAverages = Object.fromEntries(Object.keys(DIMENSIONS).map((dimension) => [
      dimension,
      analysis.paragraphs.reduce((sum, item) => sum + item.scores[dimension].score, 0) / analysis.paragraphs.length,
    ]))
    const overall = Object.values(dimensionAverages).reduce((sum, score) => sum + score, 0) / Object.keys(dimensionAverages).length
    res.json({
      paragraphs: paragraphs.map((paragraph, index) => ({ text: paragraph, ...analysis.paragraphs[index] })),
      dimensionAverages,
      overall,
      model: analysis.model,
      usage: analysis.usage,
      analyzedAt: new Date().toISOString(),
      limits: { maxParagraphs: MAX_PARAGRAPHS, maxCharacters: MAX_TEXT_CHARS },
    })
  } catch (error) {
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    const status = Number(error?.message?.match(/Jev returned HTTP (\d+)/)?.[1])
    const clientStatus = isTimeout ? 504 : status === 429 ? 503 : 502
    // Never log the submitted text or the provider response body.
    console.error('Analysis request failed', { status: status || 'network', timeout: isTimeout })
    res.status(clientStatus).json({ error: isTimeout ? 'Jev took too long to respond. Please try again.' : 'Jev could not complete this analysis. Please try again shortly.' })
  } finally {
    inFlight -= 1
  }
})

const distPath = path.resolve('dist')
app.use(express.static(distPath, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }))
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(distPath, 'index.html'), (error) => error && next(error))
})

app.use((error, _req, res, _next) => {
  const tooLarge = error?.type === 'entity.too.large'
  res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Request is too large.' : 'Invalid request.' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Jev Signal listening on ${port}; health endpoint /api/health; API key ${apiKey ? 'configured' : 'missing'}.`)
})
