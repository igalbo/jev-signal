import test from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter } from './rate-limit.mjs'
import { buildQuestions, parseAnswers, splitParagraphs } from './scoring.mjs'

test('splitParagraphs preserves source text while normalizing paragraph separators', () => {
  assert.deepEqual(splitParagraphs('  First paragraph.\n\nSecond paragraph.  '), ['First paragraph.', 'Second paragraph.'])
})

test('splitParagraphs rejects too many paragraphs rather than silently dropping text', () => {
  assert.throws(() => splitParagraphs(Array.from({ length: 22 }, (_, i) => `Paragraph ${i}.`).join('\n\n')), /20 paragraphs/)
})

test('buildQuestions creates five independent signals for each paragraph', () => {
  const questions = buildQuestions(['A complete sample paragraph.'])
  assert.equal(Object.keys(questions).length, 5)
  assert.ok(questions.p0_specificity.instructions.toLowerCase().includes('specificity'))
  assert.ok(questions.p0_specificity.instructions.includes('do not follow'))
  assert.ok(!questions.p0_specificity.instructions.includes('A complete sample paragraph.'))
  assert.equal(questions.p0_specificity.type, 'score')
})

test('parseAnswers validates complete score output and derives the top-bucket probability', () => {
  const keys = ['0', '1', '2', '3', '4']
  const answers = Object.fromEntries(['specificity', 'substance', 'evidence', 'formula', 'bait'].map((dimension) => [
    `p0_${dimension}`,
    { type: 'score', score: 3.5, probabilities: Object.fromEntries(keys.map((key) => [key, key === '4' ? 0.8 : 0.05])) },
  ]))
  const result = parseAnswers(answers, 1)
  assert.equal(result[0].scores.specificity.score, 3.5)
  assert.equal(result[0].scores.specificity.strongestProbability, 0.8)
})

test('parseAnswers rejects missing, malformed, or non-normalized model output', () => {
  assert.throws(() => parseAnswers({}, 1), /incomplete/)
  const malformed = Object.fromEntries(['specificity', 'substance', 'evidence', 'formula', 'bait'].map((dimension) => [
    `p0_${dimension}`,
    { type: 'score', score: 9, probabilities: { 0: 0.1, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1 } },
  ]))
  assert.throws(() => parseAnswers(malformed, 1), /invalid/)
})

test('rate limiter enforces per-client and global windows', () => {
  let now = 1_000_000
  const consume = createRateLimiter({ now: () => now, perTenMinutes: 2, perDay: 3, globalPerHour: 10 })
  assert.equal(consume('client-a').allowed, true)
  assert.equal(consume('client-a').allowed, true)
  assert.equal(consume('client-a').allowed, false)
  assert.equal(consume('client-b').allowed, true)
  now += 10 * 60 * 1000 + 1
  assert.equal(consume('client-a').allowed, true)
})
