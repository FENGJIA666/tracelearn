## Inspiration

A convincing explanation can feel like understanding. But can you predict what changes when a SQL condition changes, or explain why one attribute makes a key minimal?

**TraceLearn turns an explanation into something a student can test:** predict, inspect the source, change the example, and try a fresh transfer question. Our first complete course is university database foundations.

## Try it

[Download the portable practice HTML](https://github.com/FENGJIA666/tracelearn/releases/download/v1.2.0/TraceLearn-Portable.html), under 0.5 MB. It includes the real React workspace, original questions, editable concept experiments, source passages and exports. No model, Node.js or API key is needed for this route. The repository explains a localhost preview fallback if your browser restricts local files.

- [Source code and judge walkthrough](https://github.com/FENGJIA666/tracelearn)
- [Technical and evaluation report](https://github.com/FENGJIA666/tracelearn/blob/v1.2.0/submission/TraceLearn-Technical-Report.pdf)
- [Complete source and evidence package](https://github.com/FENGJIA666/tracelearn/releases/download/v1.2.0/TraceLearn-Complete-v1.2.0.zip)

## What it does

The on-screen tour connects **Predict → Experiment → Transfer → Reflect & export**, without filling in answers for the learner.

For salaries 100, 200 and NULL, does `salary <> 100` keep the missing row? Check your answer, read the source, then test it in **Counterexample Lab**: predict which rows survive, inspect each truth value, add `OR salary IS NULL`, and predict again. Change the numbers or explore `NOT IN` using your own list.

The second Lab explores **keys and attribute closure**. Select attributes, predict their key classification, and inspect every applied dependency and removal check. The calculations are deterministic; no model invents these traces. Scope is explicit: four SQL predicates and two given dependency schemas.

Open a **fresh transfer attempt** to apply the idea independently. Export Lab inputs, predictions and recomputed traces, or the Notebook's separate quiz/AI learning report. Both carry source fingerprints; Lab predictions do not enter quiz totals or certify mastery.

The original course has 20 source passages and 10 diagnostic/transfer pairs covering database fundamentals. Interface and source translations support English/Chinese; built-in questions retain English technical wording.

## Where AI helps

The full app accepts text PDFs, Markdown and TXT. Qwen3-4B explains material using hybrid retrieval and exact quotations; Qwen3-Embedding-0.6B supplies local vectors. The interface distinguishes a located quote from a correct explanation: the model can still make unsupported claims.

Select any imported passage to generate cloze practice. The source supplies the key; Qwen proposes distractors. A planner skips used sentences, verifies exact reconstruction and provenance, and prevents concurrent duplicates. These are source-recall exercises, not independently validated transfer tests.

Live AI and document import require Node.js 22.13+, Ollama and approximately 3.2 GB of model downloads. After setup, inference and material stay on the device. There is no API key, paid inference, account or hosted inference service.

## How it was built and checked

React/TypeScript provide the workspace; Node/Express, SQLite and Ollama provide the local service. Portable mode embeds its resources and denies API connections. Lab exports recompute results instead of trusting saved scores.

Version 1.2 passed **48 automated checks**, including unit and HTTP integration tests. The SQL model matched real SQLite in **1,600 row-result comparisons**. Every subset of both fixed dependency schemas—24 subsets—was checked against a separately implemented finite-relation oracle, which does not reuse the production closure algorithm. This is independent computation for checking code, not independent human research.

Tests also cover corrupt records, source hashes, stale requests, late-document generation and concurrent duplicates. Real launcher checks verified separate installations, safe reuse and changed builds without stopping existing services. The SQL counterexample path ran in the actual browser; Interface screenshots are real application captures; the cover is a designed title card.

Tested hardware: Apple M4 Pro, 24 GB memory, macOS. Direct `file://` launch could not be automated because the browser tool blocks that scheme; the verified portable interaction route uses localhost static HTTP. Windows and Linux were not tested.

## Evidence, including what still fails

The **Evidence** tab retains all **160 historical model requests** from 80 original cases, with paired methods, references, quotes, errors and saved agent-assisted judgments. Shortcuts show a supported answer, a refusal and a retained failure. They are clearly labeled recorded outputs, not live AI.

The old 40-case holdout comparison recorded 37/40 versus 38/40 accepted outputs for full-source baseline and hybrid retrieval, with 7/10 versus 9/10 correct extracted MCQ keys. Agent-assisted review judged 17/20 versus 18/20 source-answerable responses fully correct. Acceptance is not semantic correctness; these internal results were not rerun or promoted as a v1.2 improvement.

Failures include an invented university-award policy, a wrong normalization explanation and a numerical typo. An earlier all-incorrect generated question led us to narrow imported practice to source-verified recall. The report retains pilot changes, benchmark limitations and all denominators.

## Impact and contribution

Portable practice removes model installation from the curated learning loop. Local AI avoids recurring API fees and uploading notes, but still needs storage and capable hardware. No adoption, improved grades or lasting learning gains are claimed. A future study needs independent question review, consented participants and delayed transfer checks.

Codex substantially assisted with design, code, original teaching/evaluation materials, tests, debugging, visual composition and documentation. Qwen provides runtime generation; it does not compute the Lab traces. Separate organizer approval of AI-assisted code authorship has not been obtained. Original code and course content are MIT-licensed; Qwen weights are Apache-2.0 and downloaded separately. The repository includes locked dependencies, raw evidence, AI disclosure and third-party notices.
