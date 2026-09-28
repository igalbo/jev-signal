# Signal / Jev

**A reader-first writing-signal checker with a separate, uncertain AI-style estimate—not an authorship detector.** Paste a post or article to inspect specificity, substance, grounding, formulaic style, and engagement bait, with scores attached to each paragraph. A sixth, passage-level estimate indicates whether the style seems more human-like or AI-like; it is not proof of authorship.

Signal is designed for readers who want a second look without automatic feed scraping, hiding, or an unsupported claim about who wrote something.

## What it does

- Scores five separate writing signals on a 0–4 scale using TypeSafe Jev / System One.
- Keeps each score attached to the paragraph being judged; reports Jev's probability distribution, not just a binary label.
- Lets readers adjust their own highlight threshold. That preference stays in browser local storage; text and analysis results do not.
- Supports any copied text rather than relying on fragile selectors for one social network.
- Limits inputs to 30,000 characters / 20 paragraphs and applies per-client plus global rate limits.
- Keeps the Jev API key on the server. The browser never receives the secret.

**Important:** the aggregate is a simple mean of five subjective signals. It is not a probability that the passage is AI-generated, a factuality check, or evidence of authorship. Scores can be wrong, especially across genres and languages; do not use them for moderation, employment, grading, or other consequential decisions.

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
cp .env.example .env
# Set JEV_API_KEY in .env; never put it in a Vite/VITE_ variable.
npm run dev
```

The API listens on `PORT` (default `8787`) and both the server and Vite read that value from `.env`; the `/api` development proxy follows it. Open the Vite URL printed in the terminal. For production-like local testing, run `npm run build` then `npm start`.

### Environment

- `JEV_API_KEY` — TypeSafe key; `TYPESAFE_API_KEY` is also accepted.
- `RATE_LIMIT_SALT` — random server secret used to hash client IPs before in-memory throttling.
- `PORT` — HTTP listen port (default `8787`).
- `MAX_CONCURRENT_ANALYSES` — maximum simultaneous Jev calls (default `4`).

## Privacy and safety

Signal has no database, analytics, or text history. Request bodies are processed in memory, are not written to app logs, and are not retained by Signal after the response. The text **is forwarded to TypeSafe Jev** to run the judgment; TypeSafe's own data-handling terms apply. Do not paste confidential or sensitive text.

The production endpoint limits each client to 8 analyses per 10 minutes and 40 per day, and the instance to 300 analyses per hour. These controls are in-memory and reset if the process restarts; use a persistent limiter before scaling to multiple instances. Error responses do not include provider response bodies or submitted text.

## How the judgments work

For every paragraph, the server asks one Jev request with five independent `score` questions. The 0–4 rubric describes increasing presence of a signal. We show the score and the strongest score-band probability. Scores and rubric thresholds are starting points, not validated accuracy claims. The request asks Jev to treat passage text as untrusted content, not instructions.

Dimensions:

1. **Specificity:** concrete detail → vague generality.
2. **Substance:** useful information → filler/repetition.
3. **Grounding:** supported within the passage → unsupported sweeping claims (not a fact-check).
4. **Formulaic style:** fresh phrasing → stock formulas.
5. **Engagement bait:** informative → manipulative hook.

## Checks

```bash
npm test       # offline tests; no paid API calls
npm run lint
npm run build
```

The live Jev integration was smoke-tested separately with a short, non-sensitive sample. No credentials or sample text are included in the repository.

## Deployment

`Dockerfile` builds the static UI and runs the Express API in one container. `compose.yaml` joins the existing Hetzner Caddy network `easy-scraper_default`; change that network name for other hosts. The sample Caddy site for `jev-signal.apimix.dev` is versioned at [`deploy/jev-signal.apimix.dev.caddy`](deploy/jev-signal.apimix.dev.caddy). Keep the application port private behind the TLS reverse proxy—do not expose the Jev-backed endpoint directly to the public internet without rate limits.

For this host, deploy the Compose service from `/opt/jev-signal` and copy the Caddy site file into `/opt/api-factory/deploy/caddy/jev-signal.apimix.dev.caddy`, then reload the shared Caddy container. Set production `JEV_API_KEY` and a unique `RATE_LIMIT_SALT` in the server’s ignored `.env` before starting Compose.

## Research

See [`docs/market-research-2026-09-27.md`](docs/market-research-2026-09-27.md) for the dated competitive scan, project gaps, and product decisions.

## License

MIT. See [`LICENSE`](LICENSE).
