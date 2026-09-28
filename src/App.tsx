import { useMemo, useState, type CSSProperties } from 'react'
import './App.css'

type DimensionKey = 'specificity' | 'substance' | 'evidence' | 'formula' | 'bait'
type Score = { score: number; strongestProbability: number; probabilities: Record<string, number> }
type ParagraphResult = { id: string; text: string; average: number; scores: Record<DimensionKey, Score> }
type Analysis = {
  paragraphs: ParagraphResult[]
  aiAuthorship: Score
  dimensionAverages: Record<DimensionKey, number>
  overall: number
  model: string
  analyzedAt: string
}

const dimensions: { key: DimensionKey; label: string; short: string; icon: string }[] = [
  { key: 'specificity', label: 'Specificity', short: 'Concrete ↔ vague', icon: '01' },
  { key: 'substance', label: 'Substance', short: 'Useful ↔ filler', icon: '02' },
  { key: 'evidence', label: 'Grounding', short: 'Grounded ↔ unsupported', icon: '03' },
  { key: 'formula', label: 'Formulaic style', short: 'Fresh ↔ templated', icon: '04' },
  { key: 'bait', label: 'Engagement bait', short: 'Informative ↔ manipulative', icon: '05' },
]
const sampleText = `In today's fast-paced world, businesses need to embrace innovation to unlock their full potential. This isn't just about keeping up—it's about staying ahead. The future belongs to those who take action now.\n\nWhat if the real secret isn't working harder, but working smarter? Follow for more actionable insights.`
const characterLimit = 30_000

function signalLabel(value: number) {
  if (value < 0.9) return 'Few concerns — good'
  if (value < 1.8) return 'Mostly clear'
  if (value < 2.8) return 'Mixed — review it'
  return 'Many concerns — review it'
}

function aiAuthorshipLabel(value: number) {
  if (value < 1.5) return 'More human-like style'
  if (value < 2.5) return 'Unclear / mixed'
  return 'More AI-like style'
}

function App() {
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [threshold, setThreshold] = useState(() => {
    const stored = localStorage.getItem('signal-threshold')
    if (stored === null) return 2.2
    const saved = Number(stored)
    return Number.isFinite(saved) && saved >= 0 && saved <= 4 ? saved : 2.2
  })
  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text])

  function updateThreshold(value: number) {
    setThreshold(value)
    localStorage.setItem('signal-threshold', String(value))
  }

  async function analyze() {
    setError('')
    setAnalysis(null)
    setLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not analyze that text.')
      setAnalysis(body as Analysis)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connection problem. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copySummary() {
    if (!analysis) return
    const lines = [
      `Writing concerns: ${signalLabel(analysis.overall)} (${analysis.overall.toFixed(1)}/4; lower is better)`,
      ...dimensions.map(({ key, label }) => `${label}: ${analysis.dimensionAverages[key].toFixed(1)}/4`),
      `AI-style estimate: ${aiAuthorshipLabel(analysis.aiAuthorship.score)} (${analysis.aiAuthorship.score.toFixed(1)}/4) — style guess, not proof of authorship.`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Signal home">
          <span className="brand-mark" aria-hidden="true">S<span>•</span></span>
          <span>signal<span className="brand-light"> / jev</span></span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> Writing clues, not proof of who wrote it</div>
        <a className="github-link" href="https://github.com/igalbo/jev-signal" target="_blank" rel="noreferrer">Open source <span aria-hidden="true">↗</span></a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span>01</span> READING SIGNALS</div>
            <h1>Does this say<br /><em>anything?</em></h1>
            <p className="hero-deck">A second set of eyes for writing that feels polished but says very little. Inspect the signals. You make the call.</p>
            <div className="hero-points"><span><b>↗</b> Paragraph-level</span><span><b>↗</b> Five writing signals</span><span><b>↗</b> Separate AI-style estimate</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="signal-core"><span className="core-mark">S</span><span className="core-ring" /></div>
            <div className="orbit-tag tag-a">SPECIFICITY <span>↗</span></div>
            <div className="orbit-tag tag-b">SUBSTANCE <span>↗</span></div>
            <div className="orbit-tag tag-c">GROUNDING <span>↗</span></div>
            <div className="orbit-tag tag-d">FORMULA <span>↗</span></div>
            <div className="orbit-tag tag-e">INTENT <span>↗</span></div>
            <div className="hero-art-caption">Five lenses. One text.<br />No verdict on who wrote it.</div>
          </div>
        </section>

        <section className="workspace" aria-label="Text analyzer">
          <div className="section-heading">
            <div><div className="eyebrow"><span>02</span> THE CHECK</div><h2>Give it a passage.</h2></div>
            <button className="quiet-button" onClick={() => { setText(sampleText); setAnalysis(null); setError('') }}>Load a sample <span aria-hidden="true">↗</span></button>
          </div>
          <div className="analysis-grid">
            <div className="input-panel panel">
              <div className="panel-label"><span className="label-index">A</span><span>PASTE TEXT TO INSPECT</span><span className="private-tag"><i /> NO APP TEXT HISTORY</span></div>
              <label className="sr-only" htmlFor="text-input">Text to inspect</label>
              <textarea id="text-input" value={text} maxLength={characterLimit} onChange={(event) => { setText(event.target.value); setAnalysis(null); setError('') }} placeholder="Paste a post, paragraph, or short article (50+ characters)…" />
              <div className="input-footer"><span>{wordCount.toLocaleString()} words · {text.length.toLocaleString()} / {characterLimit.toLocaleString()} characters</span><button className="clear-button" onClick={() => { setText(''); setAnalysis(null); setError('') }} disabled={!text}>Clear</button></div>
              <div className="privacy-inline"><span className="lock" aria-hidden="true">⌑</span> Sent to Jev for scoring; Signal doesn’t keep an app text history.</div>
              <button className="analyze-button" onClick={analyze} disabled={loading || text.trim().length < 50}>
                {loading ? <><span className="spinner" /> Reading the signals…</> : <>Inspect the writing <span aria-hidden="true">↗</span></>}
              </button>
              {error && <p className="error-message" role="alert">{error}</p>}
              {loading && <p className="loading-note" aria-live="polite">Jev is checking each paragraph across five dimensions.</p>}
            </div>

            <div className={`results-panel panel ${analysis ? 'has-results' : ''}`} aria-live="polite">
              {!analysis ? (
                <div className="empty-state">
                  <div className="empty-symbol" aria-hidden="true"><span>···</span><i /><b /></div>
                  <span className="empty-kicker">YOUR READOUT</span>
                  <h3>Signals, not a sentence.</h3>
                  <p>We’ll score writing concerns and show a separate, uncertain AI-style estimate. Neither is proof of who wrote the passage.</p>
                  <div className="empty-axis"><span>0</span><i /><span>4</span><small>FEW CONCERNS · BETTER <b>MANY · WORSE</b></small></div>
                </div>
              ) : (
                <div className="readout">
                  <div className="readout-top"><div><div className="panel-label"><span className="label-index">B</span><span>WRITING-CONCERN SCORE</span></div><h3>{signalLabel(analysis.overall)}</h3><p>0 = few concerns · 4 = many · lower is better</p></div><div className="score-orb" style={{ '--score': `${(analysis.overall / 4) * 100}%` } as CSSProperties}><div><strong>{analysis.overall.toFixed(1)}</strong><small>/ 4</small></div></div></div>
                  <div className="ai-estimate" aria-label="Separate AI-style estimate">
                    <div className="ai-estimate-copy"><span>JEV’S AI-STYLE ESTIMATE</span><strong>{aiAuthorshipLabel(analysis.aiAuthorship.score)}</strong></div>
                    <span className="ai-estimate-score">{analysis.aiAuthorship.score.toFixed(1)}<small>/ 4</small></span>
                    <div className="ai-style-scale"><span>Human-like</span><div className="ai-style-track"><i style={{ left: `${(analysis.aiAuthorship.score / 4) * 100}%` }} /></div><span>AI-like</span></div>
                    <p className="ai-estimate-note">A style-based guess, not proof of authorship. It is separate from the writing-concern score.</p>
                  </div>
                  <div className="dimension-list">
                    {dimensions.map(({ key, label, short, icon }) => {
                      const value = analysis.dimensionAverages[key]
                      return <div className="dimension-row" key={key}>
                        <div className="dimension-name"><span className="dimension-index">{icon}</span><span><b>{label}</b><small>{short}</small></span><strong>{value.toFixed(1)}</strong></div>
                        <div className="dimension-track"><i style={{ width: `${(value / 4) * 100}%` }} /></div>
                      </div>
                    })}
                  </div>
                  <div className="readout-footer"><span><i className="model-dot" /> Jev · {analysis.model}</span><button onClick={copySummary} className="copy-button">Copy signal summary <span aria-hidden="true">↗</span></button></div>
                </div>
              )}
            </div>
          </div>

          {analysis && <section className="paragraph-results" aria-label="Paragraph review">
            <div className="paragraph-heading"><div><div className="eyebrow"><span>03</span> PARAGRAPH REVIEW</div><h2>Where the signals live.</h2></div><label className="threshold-control"><span>Flag high-concern scores at or above <b>{threshold.toFixed(1)}</b></span><input type="range" min="0" max="4" step="0.1" value={threshold} onChange={(event) => updateThreshold(Number(event.target.value))} aria-label="Highlight threshold; higher scores mean more writing concerns" /></label></div>
            <div className="paragraph-list">{analysis.paragraphs.map((paragraph, index) => {
              const flagged = paragraph.average >= threshold
              return <article className={`paragraph-card ${flagged ? 'is-flagged' : ''}`} key={paragraph.id}>
                <div className="paragraph-card-head"><span className="paragraph-number">P{String(index + 1).padStart(2, '0')}</span><span className={`paragraph-state ${flagged ? 'flagged' : ''}`}>{flagged ? 'Worth a second look' : 'Few strong signals'}</span><span className="paragraph-score">{paragraph.average.toFixed(1)} <small>/ 4</small></span></div>
                <p className="paragraph-text">{paragraph.text}</p>
                <div className="paragraph-signals">{dimensions.map(({ key, label }) => {
                  const score = paragraph.scores[key]
                  const confident = score.strongestProbability >= 0.68
                  return <div className="signal-chip" key={key}><span>{label}</span><b>{score.score.toFixed(1)}</b><i className={confident ? 'clear' : ''} title={confident ? 'One score band received most of Jev’s probability' : 'Jev’s probability is spread across score bands'} /></div>
                })}</div>
              </article>
            })}</div>
            <p className="calibration-note">Paragraph flags use writing concerns only—not the separate AI-style estimate. Lower concern scores are better; no score proves who wrote the text.</p>
          </section>}
        </section>

        <section className="method-section">
          <div className="method-title"><div className="eyebrow"><span>04</span> THE METHOD</div><h2>AI-written isn’t<br /><em>the same as</em> AI slop.</h2></div>
          <div className="method-copy"><p>Good writing can be AI-assisted. Bad writing can be entirely human. Signal doesn’t pretend to know the author—it checks for patterns readers may want to question.</p><div className="method-cards"><div><span>01 / MEASURE</span><b>Five independent signals</b><small>Specificity, substance, grounding, formula, and engagement bait.</small></div><div><span>02 / SHOW</span><b>Keep the context</b><small>Scores stay attached to the paragraph they describe.</small></div><div><span>03 / YOU DECIDE</span><b>No auto-hiding</b><small>A flag is a prompt to look again, not a verdict.</small></div></div></div>
        </section>

        <section className="privacy-section"><div className="privacy-mark" aria-hidden="true">⌑</div><div><div className="eyebrow"><span>05</span> YOUR TEXT</div><h2>Private by default.</h2><p>Text travels from your browser to this service and is forwarded to TypeSafe Jev for the check. Signal does not retain it in an app database or application logs; TypeSafe’s own data handling is separate. Don’t submit sensitive or confidential material.</p></div><span className="privacy-badge"><i /> NO APP TEXT HISTORY</span></section>
      </main>

      <footer className="footer"><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">S<span>•</span></span><span>signal<span className="brand-light"> / jev</span></span></a><span>A tool for attention, not attribution.</span><a href="https://github.com/igalbo/jev-signal" target="_blank" rel="noreferrer">Source code ↗</a></footer>
    </div>
  )
}

export default App
