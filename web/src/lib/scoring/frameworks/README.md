# Scoring frameworks

Stage-specific evaluation rubrics. Each framework defines weighted sections; each section defines sub-criteria with a strict 1–5 rubric, red flags, green flags, an exemplar, and AI evaluation notes.

## Files
- `types.ts` — `Framework`, `Section`, `SubCriterion`, `ScoringRubric`
- `pre-seed.ts` — fully populated (✅ live)
- `seed.ts` — stub (TODO: paste rubric)
- `series-a.ts` — stub (TODO: paste rubric)
- `series-b-plus.ts` — stub (TODO: paste rubric)
- `index.ts` — `getFrameworkForStage(stage)` selector + weight validator

The selector falls back to `PRE_SEED_FRAMEWORK` for any stage whose `sections` array is empty, so the dashboard never breaks while a rubric is being authored.

## Scorer
`src/lib/scoring/llm-scorer.ts` — `scoreSubmissionWithLlm(submission)` calls `gpt-4o-mini` once with the framework + submission, parses strict JSON scores per sub-criterion, and aggregates per the framework formula:

```
section_score = avg(sub_criterion 1-5 ratings) × 5     // → 0-100
composite     = Σ(section_score × section.weight)      // → 0-100
```

Top gaps are derived from any sub-criterion scored ≤ 3, sorted high→low severity.

## Status
- ✅ Pre-Seed framework data complete
- ✅ LLM scorer implemented
- 🚧 Not yet wired into the founder dashboard — the legacy deterministic rubric in `src/lib/scoring/rubric.ts` is still serving production
- 🚧 Seed / Series A / Series B+ rubrics not pasted yet
- 🚧 Dashboard UI (`ScoreSection`, `MatchesSection`) still expects the legacy 4-axis `Snapshot` shape; a compatibility adapter or UI rewrite is needed before the swap

## Submission-schema gaps

The new rubric asks for inputs the current submission form doesn't collect. The LLM will infer what it can from existing text fields, but answer quality improves substantially if we add these as explicit form fields:

| Sub-criterion | Inferred from today | Would benefit from a new field |
| --- | --- | --- |
| Problem · Pain Specificity | `problemDescription` | "How many customers have you interviewed about this problem?" (number) |
| Problem · Urgency & Frequency | `problemDescription` | "How often does this pain occur for the customer?" (Daily / Weekly / Monthly / Rarely) |
| Problem · Root Cause Clarity | `problemDescription`, `whyNow` | dedicated "Why does this problem exist structurally?" text field |
| Solution · Why Now | `whyNow` | "What specific external change makes this possible now?" (text) |
| Product · Artifact Quality | `productStage`, `demoVideoUrl` | already covered |
| Product · Core Loop Clarity | `solutionDescription` | "In one sentence, what does the user do and what do they get back?" |
| Market · TAM Credibility | `tamUsd`, `tamReasoning` | already covered if `tamReasoning` shows math; could add a "bottom-up / top-down" radio |
| Market · Beachhead Clarity | `icpDescription` | "Name your first specific customer segment + how you'll reach them" |
| Team · Founder-Market Fit | `whyThisTeam` | per-founder "personally experienced this pain?" boolean |
| Team · Execution Signal | founders' `oneLineBio` | "Notable shipped product or company" per founder |
| Team · Team Completeness | `founders[]`, `whyThisTeam` | already inferable |
| GTM · Channel Hypothesis | nothing today | dedicated "Primary acquisition channel + why" text field |
| Ask · Use of Funds Specificity | `useOfFunds` | "Series A trigger — what milestone unlocks the next round?" text |
| Ask · Raise Size Reasonableness | `raisingUsd`, `roundType` | already covered |

Adding the top 4–5 gap fields to the form is the highest-leverage next step before swapping the scorer live.

## Next steps (in order)
1. Paste Seed, Series A, Series B+ rubrics into their respective stub files
2. Decide whether to extend the submission schema (above) or accept inferred-only scoring
3. Replace `buildSnapshot` in `rubric.ts` with `scoreSubmissionWithLlm`, OR build a `buildSnapshotLlm` adapter that returns the legacy `Snapshot` shape so the dashboard works unchanged
4. Update `ScoreSection` and `MatchesSection` in `dashboard.tsx` to render variable sections (8 for Pre-Seed) instead of the fixed 4 axes
5. Cache scored results per `(submission.id, submission.updated_at)` to avoid re-scoring on every dashboard load
