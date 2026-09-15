# AI contribution disclosure

Codex was used for substantial assistance with product design, React/TypeScript/Node implementation, the original database teaching notes and exercises, evaluation scripts, debugging, visual design, documentation, and submission drafting. AI assistance is not represented as unaided manual authorship.

The runtime uses local open-weight Qwen3-4B and Qwen3-Embedding-0.6B through Ollama. No cloud inference API or private training dataset was used. Built-in exercise grading is deterministic. Imported-document explanations are AI-generated and can be wrong even when their quotes match source text. Imported cloze practice uses a source-derived key with model-proposed distractors; deterministic checks verify exact sentence reconstruction and distinct options. This is source recall, not validated conceptual assessment.

SQL and selected dependency examples were checked by deterministic tests. Broader explanation and citation review was performed by the development agent and is identified as such. No independent human study, student feedback, measured grade improvement, or real-user adoption is claimed. Screenshots show actual software acceptance sessions, not study participants.

The public competition page encourages AI projects. This disclosure does not claim separate organizer approval of AI-assisted code authorship.

## Version 1.2

Codex also assisted with the Counterexample Lab, guided route, stale-request recovery, selected-passage planner, installation identity, tests and release documentation. At runtime, SQL truth values, attribute closures, candidate-key checks, prediction comparisons and Lab exports use deterministic code. No AI generates their calculations or traces.

The SQL implementation was compared with actual SQLite. A separately implemented oracle enumerates legal binary tuple pairs for the two fixed dependency schemas; it does not call the production closure function. This independence is between checking algorithms, not between human authors or study assessors. All demonstrations and saved acceptance records are software tests, not participant data.

Lab inputs and predictions are separate from quiz scores. The source hash accompanies each record, and export recomputes derived outcomes instead of trusting stored grades. None of these measures establishes durable understanding or improved learning.

The original course, `server/ai.ts` and all `evaluation/*` files remain unchanged. The new source-practice planner invokes the existing generator on a selected original sentence without changing the document hash. The 160 historical AI requests and their errors are still visible; they were not rerun, regraded or promoted as a new performance result.

## Version 1.1

Codex also implemented the portable practice adapter, Evidence viewer, latest-attempt review rules, regression tests and release materials. All 160 displayed records derive from the unchanged v1.0 raw experiment. No new benchmark performance or independent learning outcome is claimed. Portable mode makes no model calls; recorded examples are labeled in the interface.
