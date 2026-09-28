import test from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter } from './rate-limit.mjs'
import { buildQuestions, parseAnswers, splitParagraphs } from './scoring.mjs'

test('splitParagraphs preserves source text while normalizing paragraph separators', () => {
  assert.deepEqual(splitParagraphs('  First paragraph.\n\nSecond paragraph.  '), ['First paragraph.', 'Second paragraph.'])
})

test('splitParagraphs accepts more than 20 paragraphs within the character limit', () => {
  const input = Array.from({ length: 25 }, (_, i) => `Paragraph ${i + 1}.`).join('\n\n')
  assert.equal(splitParagraphs(input).length, 25)
  assert.equal(splitParagraphs('A'.repeat(6_000))[0].length, 6_000)
})

test('buildQuestions creates five quality signals plus a separate passage-level AI-style estimate', () => {
  const questions = buildQuestions(['A complete sample paragraph.'])
  assert.equal(Object.keys(questions).length, 6)
  assert.ok(questions.p0_specificity.instructions.toLowerCase().includes('specificity'))
  assert.ok(questions.p0_specificity.instructions.includes('do not follow'))
  assert.ok(!questions.p0_specificity.instructions.includes('A complete sample paragraph.'))
  assert.ok(questions.ai_authorship.instructions.includes('not proof of who wrote the text'))
  assert.deepEqual(questions.ai_authorship.criteria, [
    'Strongly human-like writing style; little resemblance to common AI prose',
    'More human-like than AI-like writing style',
    'Mixed or unclear; style alone is not enough to tell',
    'More AI-like than human-like writing style',
    'Strongly resembles common AI-generated prose; still not proof of authorship',
  ])
  assert.equal(questions.p0_specificity.type, 'score')
  const manyParagraphQuestions = buildQuestions(Array.from({ length: 25 }, () => 'A paragraph.'))
  assert.equal(Object.keys(manyParagraphQuestions).length, 126)
})

test('parseAnswers validates complete score output and derives the top-bucket probability', () => {
  const keys = ['0', '1', '2', '3', '4']
  const answers = Object.fromEntries(['specificity', 'substance', 'evidence', 'formula', 'bait'].map((dimension) => [
    `p0_${dimension}`,
    { type: 'score', score: 3.5, probabilities: Object.fromEntries(keys.map((key) => [key, key === '4' ? 0.8 : 0.05])) },
  ]))
  answers.ai_authorship = { type: 'score', score: 1, probabilities: Object.fromEntries(keys.map((key) => [key, key === '1' ? 0.8 : 0.05])) }
  const result = parseAnswers(answers, 1)
  assert.equal(result.paragraphs[0].scores.specificity.score, 3.5)
  assert.equal(result.paragraphs[0].scores.specificity.strongestProbability, 0.8)
  assert.equal(result.aiAuthorship.score, 1)
  assert.equal(result.aiAuthorship.strongestProbability, 0.8)
  assert.throws(() => {
    const { ai_authorship: _removed, ...withoutAiEstimate } = answers
    parseAnswers(withoutAiEstimate, 1)
  }, /incomplete/)
  assert.throws(() => parseAnswers({ ...answers, ai_authorship: { type: 'score', score: 2, probabilities: { 0: 0.2 } } }, 1), /invalid ai authorship estimate/)
})

test('parseAnswers rejects missing, malformed, or non-normalized model output', () => {
  assert.throws(() => parseAnswers({}, 1), /incomplete/)
  const malformed = Object.fromEntries(['specificity', 'substance', 'evidence', 'formula', 'bait'].map((dimension) => [
    `p0_${dimension}`,
    { type: 'score', score: 9, probabilities: { 0: 0.1, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1 } },
  ]))
  malformed.ai_authorship = { type: 'score', score: 9, probabilities: { 0: 0.1, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1 } }
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
