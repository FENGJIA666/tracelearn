# Changelog

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
