# Changelog

## 1.3.0 — inspectable conclusions and a fresh configuration comparison

- The local answer pipeline selects exact source excerpts by ID, forms one concise conclusion, and asks the same local model to review answerability, every clause, source attribution and question coverage. A failed check is distinct from source insufficiency; retries and the total request time are bounded. Automated acceptance remains fallible.
- Production inference uses pinned Qwen3.5-9B with a 16,384-token context and explicit overflow rejection. The prior Qwen3-4B configuration and original evaluation remain unchanged as historical evidence. The new comparison changes both model and pipeline; it is not a same-model ablation.
- New recorded-evidence views expose paired results, exact request-specific sources, references and saved Codex judgments. Full denominators, errors and unsupported accepted outputs remain visible. The dataset author also grades the outputs; no independent human or learning-effect claim is made.
- Saved answers reopen with their original evidence. Source-recall generation checks known SQL aliases, document import preserves Unicode characters at chunk boundaries, and cancellation no longer turns its button into an accidental new submission.
- Concept experiments, fresh practice and source navigation stay connected. Current configuration records and original experiments have separate views; each retains its own evidence.
- Reproduction files preserve rejected development variants, the pre-holdout freeze, raw model exchanges and final artifact hashes. The report and judge route identify tested behavior and remaining limits.

## 1.2.0 - 2026-09-15

- Added Counterexample Lab: predict before computing, edit SQL NULL values/conditions or key attributes, inspect deterministic traces, then open a fresh transfer attempt.
- Checked 1,600 SQL row results against real SQLite and every subset of both fixed dependency schemas against a separately implemented finite-relation oracle. No AI generates these calculations.
- Added separate Lab history/export. The latest 100 input/prediction records are tied to the source hash; exported outcomes are recomputed. Lab predictions do not enter quiz totals.
- Added an on-screen quick tour and recorded-answer/refusal/failure shortcuts without hiding any of the 160 historical AI requests.
- Expanded imported-source cloze practice to any selected passage, with unused-sentence planning, exact key reconstruction, explicit exhaustion and transactional duplicate prevention.
- Guarded asynchronous course/question/model work against stale responses; changing context invalidates the older UI update. Corrected the live AI quote badge and explanatory copy to distinguish located quotations from verified reasoning.
- Added installation/build identity and a Mac launcher that reuses only its exact copy. Real headless checks verified two simultaneous copies, unchanged-copy reuse, a new server after source/build changes, and cleanup limited to launcher-owned processes.
- Passed 48 automated checks, including unit and isolated HTTP integration tests. See `evidence/v1.2-lab-method.md` and the current `evidence/v1.2-acceptance.md` for scope.
- Preserved the original course, `server/ai.ts` and every `evaluation/*` file. No revised benchmark score or learning gain is claimed.

## 1.1.0 - 2026-09-15

- Added a self-contained portable practice HTML using the real course, grading, source viewer, review plan and export. Fresh AI and document import remain in the full app.
- Added an Evidence tab covering all 160 frozen requests, both methods and failures, with source links and explicitly labeled agent-assisted review.
- Added latest-attempt review suggestions: confident mistakes, other mistakes, then untried transfer checks. No mastery score is inferred.
- Passed 22 unit tests, 11 HTTP checks and both builds; browser acceptance and its direct-file limitation are recorded in evidence/v1.1-acceptance.md.
- Kept server/ai.ts and evaluation/* byte-identical to v1.0.0. No score tuning or new model benchmark is claimed.

## 1.0.0 - 2026-09-14

### Added

- First public release of the local TraceLearn study workspace, with source-linked feedback, deterministic practice grading, transfer checks, and an exportable learning trail.
- Original database course, local Qwen inference, document import, English/Chinese interface and source translations, and source-recall practice for imported material.
- A judge guide, technical report, actual screenshots, locked dependencies, and recorded software tests and 160 final evaluation requests.

### Publication notes

- This release publishes the previously tested local application. Runtime code and the frozen evaluation records are unchanged by the publication work.
- Delivery documentation now points to the public repository and release. The application continues to run locally and model weights are downloaded separately.
- Known semantic errors, bounded refusal behavior, and the absence of independent learning-outcome evidence are documented in the report.
