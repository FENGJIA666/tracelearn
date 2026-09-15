## Review the project

- [Browse the source code and judge walkthrough](https://github.com/FENGJIA666/tracelearn)
- [Read the technical and evaluation report (PDF)](https://github.com/FENGJIA666/tracelearn/blob/v1.1.0/submission/TraceLearn-Technical-Report.pdf)
- [Download the complete source and evidence package](https://github.com/FENGJIA666/tracelearn/releases/download/v1.1.0/TraceLearn-Complete-v1.1.0.zip)

**Start in under 0.5 MB:** [download the portable practice HTML](https://github.com/FENGJIA666/tracelearn/releases/download/v1.1.0/TraceLearn-Portable.html). It contains the real 20-question practice loop, source passages, review plan and export. No model, Node.js or API key is needed for these features. Download and open in a browser; the repository documents a localhost static preview fallback for restricted environments.

The **Evidence** tab lets reviewers inspect all 160 recorded requests, both methods, original references, quotes and saved agent-assisted judgments. These are clearly labeled historical outputs, not live AI. Mistakes and failures remain visible.

For fresh local AI answers and document import, install Node.js 22.13+ and Ollama, then run `npm run setup` and `npm start`. Model downloads total approximately 3.2 GB. The app was tested on Apple M4 Pro with 24 GB memory; there is no hosted inference service.

## Inspiration

A fluent explanation can make a concept feel familiar without showing that a learner can apply it. **TraceLearn connects an answer to its source, a possible misconception, and a fresh transfer question.** The starting point is a small but revealing database example: why does `salary <> 100` exclude a row whose salary is NULL?

The goal is an inspectable learning process that students can run on their own computer, without uploading their notes to a cloud model or paying per API request.

## What it does

TraceLearn is a working local AI study workspace with an original university database course: 20 source passages and 10 diagnostic/transfer pairs covering SQL NULL, keys, functional dependencies, closures, normal forms, decomposition and joins.

1. **Diagnose:** choose an answer and record confidence.
2. **Trace:** inspect targeted feedback and open the original supporting passage.
3. **Transfer:** apply the concept to a different condition or inference.
4. **Reflect:** revisit the latest confident mistakes first, then other mistakes and untried transfer checks; export an attempt report with source fingerprints.

For example, choosing “200 and NULL” for `salary <> 100` surfaces a possible confusion between UNKNOWN and an ordinary value. The source explains that WHERE keeps only TRUE. The follow-up asks how to retain 20 and NULL while excluding 10; the correct condition explicitly includes `IS NULL`.

These are scripted demonstration attempts, not study-participant results. Feedback suggests a possible misconception; it does not claim to diagnose a person's cognition or certify mastery.

Students can also import text PDFs, Markdown or TXT and ask source-grounded questions. Qwen generates explanations locally, with links to exact source excerpts. Imported-source practice uses explicitly labeled AI-assisted verbatim cloze questions. The server selects the source phrase as the correct option; the local model supplies three distinct distractors. The keyed answer reconstructs the original source sentence exactly. This checks source recall, not conceptual transfer. The interface and original source translations support English and Chinese; built-in questions retain English technical wording.

## How it was built

The application uses **React, TypeScript, Node.js, Express, SQLite and Ollama**. It runs on `127.0.0.1`. There are no accounts, API keys, external fonts or cloud inference calls.

The retrieval pipeline combines keyword overlap and Qwen3-Embedding-0.6B cosine similarity, then passes five passages to Qwen3-4B. Inference uses fixed parameters: temperature 0, seed 42, 8,192 context tokens and a 1,200-token output cap, with thinking disabled. Exact model digests and locked dependencies are recorded in the source package.

Structured output passes JSON/schema checks and exact source-quote matching. Invalid output gets one retry, then an explicit error. Known exercises are graded deterministically. Text imports preserve source IDs, page/segment numbers and SHA-256 fingerprints. SQLite keeps the material and history on the local device.

The app accepts up to 10 MB and 50 PDF pages; scanned PDFs need external OCR. It supports cancellation, refresh recovery, keyboard operation, source navigation and Markdown report export. Imported-question generation currently uses the first five source passages.

## What was tested

Version 1.1 passed **22 unit tests**, **11 isolated HTTP checks**, the normal production build and the portable build on an **Apple M4 Pro with 24 GB memory**. New checks compare every displayed result with the frozen raw records and every portable answer choice with the original keys. Portable preview checks covered real attempts, source navigation, review priorities, export, refresh recovery, keyboard input, English/Chinese controls and 320/768/1024/1440-pixel layouts. No resource/API requests followed the single HTML document load. Direct local-file launch remains unverified because browser automation blocks `file://`; the verified route is a localhost static preview. A fresh full-app AI request also completed with real source quotes.

The following model measurements are the unchanged 14 September v1.0 experiment, not a newly tuned v1.1 benchmark. The app and Ollama also answered real questions with outbound network restricted to localhost: 6.62 seconds after a model-server restart and 4.17 seconds for a warm repeat. External DNS and direct-IP requests were denied by the test policy.

Actual browser checks covered the diagnostic-to-transfer workflow, source navigation, export, refresh restoration, Markdown import, keyboard answer selection and cancellation. Gallery images are captures of the real application.

The frozen internal dataset has 80 original cases: 40 source-answerable questions, 20 source-unanswerable questions and 20 multiple-choice questions, split evenly into development and holdout sets. Each case was run under two conditions, giving **160 final requests**. The baseline receives the complete 20-passage course; the hybrid method receives five retrieved passages. Both use the same model, prompt and output checks.

On the 40-case holdout split:

| Measure | Full-source baseline | Hybrid retrieval |
| --- | --- | --- |
| Accepted output | 37/40 | 38/40 |
| Correct extracted MCQ letter | 7/10 | 9/10 |
| Median request wall time | 6.25 seconds | 3.21 seconds |
| Structured insufficient flag on outside-source cases | 6/10 | 4/10 |

Accepted output is not semantic correctness. Agent-assisted review judged 17/20 baseline and 18/20 hybrid source-answerable responses fully correct. Reading the outside-source answers found textual refusals on 8/10 for each method and validation failures on the remaining 2/10; the model's structured flag sometimes disagreed with its prose. All failures remain in the denominators.

This is a small, author-created benchmark with related concepts in both splits, not an independent educational study. Model timing depends on warm state and concurrent local workload. Two earlier pilots exposed question echoes and option-letter leakage in separate UI checks; their records are retained, and final results use the frozen v3 prompt. Some pilot holdout requests ran, but their answer content was not used for prompt tuning.

## Challenges and what was learned

**A matching quotation does not prove that an explanation is correct.** The final run includes a correct SQL condition paired with a “10:00” typo, an unsupported 3NF explanation, and a development case inventing a university award policy. These are documented limitations, not removed examples.

A representative document-instruction test asked the model to report a false count of 999. It instead answered the source-supported counts, 3 and 2. One passing fixture does not establish general prompt-injection robustness.

Free-form imported-question generation produced an all-incorrect option set during acceptance. That path was narrowed to deterministic source-recall cloze validation; the curated diagnostic and transfer course remains unchanged.

The narrow scope made it possible to inspect every built-in question, execute SQL examples and check selected key closures. The most useful engineering lesson was to keep deterministic grading, quote validation and semantic judgment visibly separate.

## Impact and next steps

The portable practice removes model and dependency installation from the curated learning loop. The full AI route, after dependency and model downloads, avoids recurring API fees and keeps study material on the device. It still requires capable hardware and storage, so zero API cost does not mean zero access cost. No real-user adoption, measured grade improvement or long-term learning benefit is claimed.

The next research step is an independently reviewed, consented study using delayed transfer questions. Technical priorities are better refusal consistency, broader document coverage for generated questions, and stronger semantic checks.

## AI contribution and delivery

Codex substantially assisted with product design, implementation, original teaching/evaluation materials, testing, debugging, visual composition and documentation. Qwen supplies local runtime generation. Agent-assisted review is identified as such and is not an independent human evaluation. Separate organizer approval of AI-assisted code authorship has not been obtained.

Original application code and course materials are MIT-licensed. Qwen model weights are Apache-2.0 and downloaded separately; third-party dependencies retain their licenses. The public repository and versioned release include source, a lockfile, setup/start scripts, raw evaluation records, technical report, AI disclosure and license inventory. The application runs on the reviewer's own computer; this page and the linked materials present the implemented workflow, measured results and actual screenshots.
