## Inspiration

A convincing explanation can feel like understanding. Can you predict what changes when a SQL condition changes, or explain why removing one attribute stops a set from being a key?

**TraceLearn makes an explanation testable:** predict, inspect the source, change the example, and try a fresh transfer question. Our first complete course covers university database foundations.

## Try it

[Download the portable practice HTML](https://github.com/FENGJIA666/tracelearn/releases/download/v1.3.0/TraceLearn-Portable.html). It includes the real React workspace, original questions, editable concept experiments, recorded evaluation evidence and exports. No model, Node.js or API key is needed for this route. The repository gives a localhost preview fallback for browsers that restrict local files.

- [Source code and judge walkthrough](https://github.com/FENGJIA666/tracelearn)
- [Technical and evaluation report](https://github.com/FENGJIA666/tracelearn/blob/v1.3.0/submission/TraceLearn-Technical-Report.pdf)
- [Complete source and evidence package](https://github.com/FENGJIA666/tracelearn/releases/download/v1.3.0/TraceLearn-Complete-v1.3.0.zip)

## What it does

The on-screen tour connects **Predict → Experiment → Transfer → Reflect & export**, without answering for the learner.

For salaries 100, 200 and NULL, does `salary <> 100` keep the missing row? Check your prediction, inspect the source, then test it in **Counterexample Lab**. Inspect TRUE, FALSE and UNKNOWN for each row. Add `OR salary IS NULL`, change the numbers, or explore `NOT IN`, then predict again.

The second Lab explores **keys and attribute closure**. Select attributes and inspect each applied dependency and removal check. These traces come from deterministic computation. Scope is explicit: four SQL predicates and two given dependency schemas.

Open a fresh question matched to the concept you explored. Notebook reopens saved local answers and their source evidence without another model call. Export the quiz/AI learning record or Lab inputs and recomputed traces. Lab predictions remain separate from quiz totals; neither certifies mastery.

The course contains 20 original passages and 10 diagnostic/transfer pairs. Interface and source translations support English/Chinese; built-in questions preserve English technical wording.

## AI that shows its evidence and limits

The full app accepts text PDFs, Markdown and TXT. Qwen3.5-9B drafts a concise source-based conclusion, while Qwen3-Embedding-0.6B supports hybrid retrieval. **The model selects numbered excerpts; the program supplies the original quotation text.** It cannot invent or splice the displayed quote.

A separate call to the same local model reviews whether the requested information is established, the conclusion and its own citations, and coverage of applicable conditions. The app distinguishes an accepted explanation, insufficient source evidence and a response that failed local checks. A correct quotation still does not prove correct reasoning, and same-model review can be wrong. The interface says so.

Imported-note practice uses a deterministic source phrase as its keyed answer; Qwen proposes distractors. The planner avoids used sentences, checks exact reconstruction, rejects duplicate wording and a known SQL non-NULL alias family, and prevents concurrent duplicate saves. This is source recall, not an independently validated transfer assessment.

Live AI and importing require Node.js 22.13+, Ollama 0.34.0+ and approximately 7.234 GB for the two application models. Subsequent inference and study material stay on the device. There is no API key, paid inference, account or hosted model service.

## How it was built and checked

React/TypeScript provide the workspace; Node/Express, SQLite and Ollama provide the local service. Portable mode embeds resources and denies API connections. Silent model-input truncation is disabled. Cancellation stops in-flight work and prevents stale responses from replacing the active question; an answer saved just before cancellation may remain in history.

The SQL model matched real SQLite in 1,600 row-result comparisons. All 24 attribute subsets across the two fixed schemas were checked against a separately implemented finite-relation oracle. This is independent computation for checking code, not independent human research.

The final 123 automated tests passed, alongside 11 isolated HTTP checks. Tests cover source hashes, imports, cloze options, late responses, cancellation, report state, stored records, selected-passage generation and installation identity. The current acceptance record links the actual automated, browser and local-runtime checks; screenshots show the real app, and the cover is a designed title card.

Tested hardware is Apple M4 Pro with 24 GB memory on macOS. With both application and model server restricted to localhost networking, the real cold request took 25.8 seconds and its warm repeat 16.0 seconds. Cold means a restarted, unloaded model runtime and fresh source-vector storage; this is a process-network test, not a whole-computer disconnection. Portable interaction was verified through static localhost HTTP; direct `file://` automation is blocked by the browser tool. Windows and Linux were not tested.

## Evidence, including failures

The current comparison contains 80 new author-created cases across four fictional source documents, split into 40 development and 40 held-out questions. Each split balances English/Chinese and includes answerable questions, missing information and false premises. The holdout was opened only after recording the implementation, model, runner and scoring-protocol freeze.

**On the first 40-case holdout, the current configuration achieved 34/40 strictly correct results versus 18/40 for the previous configuration.** The current version delivered 39/40 responses, including four with definite unsupported assertions; six tasks did not meet the strict rule. One comparator judgment has a source-wording ambiguity and remains unresolved, with no credit in the strict total. Development scores were 38/40 versus 20/40 and were used for tuning.

The **Evidence** view lets a judge inspect both configurations, final answers, actual cited inputs and saved scoring reasons. Strict correctness comes from a separate Codex reading of the saved output, not the runtime model's support label. The same Codex agent authored the dataset and performed the semantic review; it is neither blinded nor independent human scoring. Errors and unverified responses remain in the denominators.

Earlier developer trials exposed wrong numerical reasoning, correct facts paired with the wrong quote, avoidable refusals, and unwanted factual additions. All trials remain available. The previous production configuration is the comparator; model weights and answer behavior both change, so this is not a single-variable ablation. The original 160-request experiment is also preserved separately, with its original failures and scores.

## Impact and contribution

Portable practice removes model installation from the curated learning loop. Local AI avoids recurring API fees and uploading notes, while still requiring storage and capable hardware. We have not measured adoption, improved grades or lasting learning gains. A future study needs independent question review, consented participants and delayed transfer checks.

Codex substantially assisted with design, code, original teaching/evaluation materials, testing, debugging, visual composition and documentation. Qwen provides runtime generation; it does not compute the Lab traces. Separate organizer approval of AI-assisted code authorship has not been obtained. Original code and course content are MIT-licensed; Qwen weights use Apache-2.0 and are downloaded separately. Locked dependencies, raw evidence and contribution/license notices accompany the source.
