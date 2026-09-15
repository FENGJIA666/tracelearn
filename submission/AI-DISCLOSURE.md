# AI contribution disclosure

Codex substantially assisted with product design, React/TypeScript/Node implementation, original database teaching notes and exercises, evaluation scripts and scoring review, debugging, visual design, documentation and submission drafting. This work is not represented as unaided manual authorship. The v1.3 title card was edited with built-in image generation; application screenshots are actual interface captures. The cover prompt and asset hash are in [cover provenance](../evidence/v1.3/cover-provenance.json).

## Current runtime: version 1.3

The application uses local open-weight `qwen3.5:9b` for answers and source-recall distractors, and `qwen3-embedding:0.6b` for retrieval, through Ollama. It requires Node.js 22.13+ and Ollama 0.34.0+; setup checks the Ollama minimum before downloading because this version relies on tested chat `truncate:false` behavior. No cloud inference API or private training dataset is used.

The configured generation context is 16,384 tokens with a 1,800-token output limit, `think:false` and `truncate:false`; full parameters are in [local-model.ts](../server/local-model.ts). The two application models total approximately 7.234 GB of downloads. The old `qwen3:4b` model (approximately 2.5 GB extra) is needed only to reproduce the frozen evaluation configuration, not to use the application.

For source questions, code creates exact excerpts from retrieved passages. The model selects at most two excerpt identifiers and writes one concise conclusion with the requested result and essential reason. Code resolves and validates original quotations; another call to the same model reviews answerability, support, source attribution and coverage of applicable conditions. There are at most two rounds/four chat calls within a 180-second answer-request deadline. `supported`, `insufficient` and `unverified` are automated outcomes, not independent correctness judgments. Exact quotation and same-model review can coexist with an incorrect answer.

Imported cloze practice uses an answer taken directly from the source and model-proposed distractors. Code verifies exact reconstruction, distinct options and unused sentences. A narrow SQL terminology check rejects competing non-NULL aliases; a failed option-quality check permits at most one extra repair after at most two original generation calls. It does not implement general semantic equivalence or validated conceptual assessment. These are verbatim source-recall exercises, separate from the authored diagnostic/transfer pairs.

Built-in grading, SQL truth values, attribute closures, candidate-key checks and Lab exports are deterministic. The Lab selects a transfer question and source matching its active condition/schema. Notebook replays saved questions, answers and citations without regenerating them. Older answers retain their original quote-only status. Request cancellation and stale-result recovery are software behavior; their tests are not participant observations.

## Evaluation and evidence boundaries

The [v1.3 final manifest](../evidence/v1.3/final-manifest.json) identifies completed development/holdout coverage, model settings, frozen source and raw provenance; an absent or incomplete manifest is not evidence of a completed comparison. Development prefixes are iteration records, not complete final results. The comparison changes model weights and answer/review logic, so it does not isolate a single causal factor.

Semantic scoring was performed by the dataset-author Codex agent. It is neither blinded nor independent human assessment; the local model's own review is not substituted for saved scoring. The viewer checks raw hashes for its projection, displays saved judgments and preserves failures; it does not rescore answers. No independent student study, measured grade improvement, student feedback or real-user adoption is claimed. Software screenshots depict acceptance sessions, not study participants; explicitly mocked UI checks do not establish model quality. The [v1.3 acceptance record](../evidence/v1.3/acceptance.md) states the completed software checks and limits.

The SQL implementation was compared with actual SQLite. A separately implemented oracle enumerates legal binary tuple pairs for two fixed dependency schemas, without calling the production closure function. This independence is between algorithms, not human authors or assessors. Lab exports recompute outcomes from inputs and predictions, which remain separate from quiz scores. None of this establishes durable understanding or improved learning.

The public competition page encourages AI projects. This disclosure does not claim separate organizer approval of AI-assisted code authorship.

## Preserved historical work

The original course, `server/ai.ts` and all `evaluation/*` files remain frozen. They retain the original 80-case, 160-request Qwen3-4B experiment, including errors and saved agent-assisted scoring. Its measurements are historical, not current-model performance. Version 1.3 uses a new configurable source-recall factory and local-model adapter; it does not rewrite the old generator or its evaluation record.

In version 1.2, Codex also assisted with the Counterexample Lab, guided route, selected-passage planner, installation identity, stale-request recovery, tests and release materials. Its planner wrapped the existing generator without changing the original document hash or benchmark. Version 1.1 added the portable adapter, original Evidence viewer, latest-attempt review rules and tests. Their acceptance records describe those versions only. Portable mode makes no model calls; recorded examples are labeled in the interface.
