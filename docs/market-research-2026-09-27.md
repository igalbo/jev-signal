# Jev-powered slop detection: market scan

**Research snapshot:** September 27, 2026 (UTC). Repository stars and activity change quickly; stars are a weak attention signal, not evidence of quality, active users, or detector accuracy.

## Landscape

- **[`lukstei/slop-grader`](https://github.com/lukstei/slop-grader)** — the highest-starred relevant text-grading repo found in this scan: 30 stars, 2 forks, and 101 commits at lookup. It is a developer CLI, not a consumer reader: configurable line/document rulesets, batching, surrounding-line context, incremental local caching, JSON/CI output, and a review-agent workflow. Its README explicitly warns that its thresholds are fitted to exact question wording and should be checked against labelled data. This is the strongest general-purpose rubric/evaluation pattern to learn from.
- **[`tomfrazier/slopmop`](https://github.com/tomfrazier/slopmop)** — recently active LinkedIn-only Chromium extension plus Vercel backend. It judges writing rather than authorship, shows reasons, supports hide/highlight modes, user overrides and votes, and has an admin view. Its maintainer says tuned thresholds came from 27 hand votes, calls the result an experiment, and notes formal human writing, humor, translation, and unusual genres can confuse it. The backend stores text hashes, LinkedIn IDs, scores/engagement and 90-day check logs; it does not store the post text itself. One GitHub star at lookup.
- **[`Arpit-Khandelwal/jev-linkedin-slop-filter`](https://github.com/Arpit-Khandelwal/jev-linkedin-slop-filter)** — LinkedIn extension/local proxy that labels BAIT/CORP/BRAG and keeps the key server-side. Its README describes 14 labelled examples (4 engagement-bait, 4 genuine, 3 corporate, 3 ambiguous), English-only/text-only operation, no explanation, and a LinkedIn selector likely to break. Five stars, one fork at lookup.
- **[`jxxfdgd/jev-ai-slop-detector`](https://github.com/jxxfdgd/jev-ai-slop-detector)** — new X/LinkedIn/Reddit extension with real-time flags; 2 stars at lookup. Useful cross-feed direction, but little public evaluation evidence so far.
- **[`neddes/sloppy-jevs-extension`](https://github.com/neddes/sloppy-jevs-extension)** — BYOK extension that automatically scans many pages and blurs AI prose/ads. This removes proxy cost, but asks for broad site access and sends extracted page text/context directly to TypeSafe. One star at lookup.
- **[`fazlerocks/jev-adblock`](https://github.com/fazlerocks/jev-adblock)** — adjacent, not a slop detector: a BYOK ad-classification extension with category thresholds, local corrections, caching, daily budgets, and safety rails. Four stars at lookup. Its explicit per-field privacy disclosure and budget controls are good product patterns.

The projects are very new. In this snapshot, developer tooling attracts the most GitHub attention, while reader-facing tools cluster around one-network extensions, automatic feed scanning, BYOK, or coarse stamps. Small star counts do not tell us whether a browser store or social community has more users.

## Gaps and design decisions

1. **Don't claim AI authorship from prose style.** Human-written text can be formulaic and AI-assisted writing can be useful. Signal reports writing qualities only; it never emits “human-written” or “AI-written.”
2. **Show the evidence at the unit the reader can judge.** A single post score hides which part triggered it. Signal scores each paragraph and exposes five separate dimensions plus the source paragraph.
3. **Avoid tying the product to one brittle social DOM.** Feed extensions gain convenience but inherit hashed selectors, page changes, and broad permissions. Signal begins with user-selected/pasted text and works across websites without scraping a feed. A future extension should inspect only text the user explicitly selects.
4. **Make the threshold inspectable and reversible.** Readers choose their own highlight threshold; Signal never hides, reports, or blocks a post.
5. **Minimize retention.** The app stores no passage, score history, or user vote on its server. Text still goes to TypeSafe for judgment, and the privacy notice says so plainly. The service uses request caps and server-side keys.
6. **Treat evaluation as the missing hard problem.** A 14- or 27-example tuning set is useful for smoke tests, not broad accuracy. Signal makes no accuracy claim. Before claiming precision or adding any moderation-like action, gather a larger, diverse, independently human-rated corpus (including human-written polished text, AI-assisted high-quality text, genres, languages, and short/long passages), publish calibration/error slices, and keep abstention visible.
7. **No generated “reason” presented as a quote.** Jev returns typed scores; Signal shows the judged paragraph and named rubric dimensions rather than inventing an explanation. The reader can inspect the actual text that scored.

## Product scope

The shipped MVP is a responsive paste-and-review website, not a social feed scraper. It makes the review loop cross-site and portable while preserving paragraph context and user control. The adjustable threshold and no-retention backend are deliberate differentiators; browser-extension capture is a follow-up only if users value the workflow enough to justify its extra permissions and review burden.

## Primary references

- TypeSafe API schema/docs: <https://api.typesafe.ai/docs>
- Slop Grader repo: <https://github.com/lukstei/slop-grader>
- Slop Mop repo: <https://github.com/tomfrazier/slopmop>
- LinkedIn filter repo: <https://github.com/Arpit-Khandelwal/jev-linkedin-slop-filter>
- Multi-site extension repo: <https://github.com/jxxfdgd/jev-ai-slop-detector>
- Sloppy Jev's repo: <https://github.com/neddes/sloppy-jevs-extension>
- Jev Ad Blocker repo: <https://github.com/fazlerocks/jev-adblock>
