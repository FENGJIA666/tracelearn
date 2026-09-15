# Changelog

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
