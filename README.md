# TraceLearn

**Learning that can show its work.**

[Try the portable practice](https://github.com/FENGJIA666/tracelearn/releases/download/v1.3.0/TraceLearn-Portable.html) · [Technical report](submission/TraceLearn-Technical-Report.pdf) · [Complete package](https://github.com/FENGJIA666/tracelearn/releases/download/v1.3.0/TraceLearn-Complete-v1.3.0.zip) · [Judge walkthrough](JUDGE-GUIDE.md) · [Devpost project](https://devpost.com/software/tracelearn-learning-that-can-show-its-work)

![The real TraceLearn learning workspace](submission/01-learning-workspace.png)

TraceLearn is a local learning workspace for university students. **Predict an answer, inspect its source, change the example, and try a fresh transfer question.** The Counterexample Lab makes explanations testable: edit SQL values and conditions to see which rows survive, or select attributes to follow a key-closure calculation. These computations use deterministic code. A local language model separately answers source questions and proposes distractors for imported-note practice.

The original course covers SQL NULL, aggregates, NOT IN, candidate keys, functional dependencies, closures, 2NF, 3NF/BCNF, decomposition and LEFT JOIN. It contains 20 passages and 10 diagnostic/transfer pairs. No private student files are included.

## Try the portable practice first

[Download TraceLearn-Portable.html](https://github.com/FENGJIA666/tracelearn/releases/download/v1.3.0/TraceLearn-Portable.html) and open it in a browser. The single file contains the React workspace, original questions, editable experiments, source passages, review suggestions and exports. These features need no Node.js, model download or API key. If local-file opening is restricted, run `python3 -m http.server 4329 --bind 127.0.0.1 --directory submission` from the extracted project and visit <http://127.0.0.1:4329/TraceLearn-Portable.html>.

The **Quick tour** connects Predict → Experiment → Transfer → Reflect & export. It opens real application states without answering for the learner. A transfer question matches the selected Lab condition or dependency schema and opens as a fresh attempt. **Ask the source** and importing your own notes require the full local app.

**Evidence is recorded, not live AI.** The viewer separates the v1.3 configuration comparison from the original 160-request experiment. The new view is designed for the complete 80-case, two-configuration run: 160 requests, including failures. It defaults to holdout and supports current-configuration success/failure filters. Each pair retains its final answer or error, saved scoring rationale, citations and input snapshots. Strict-correct totals come from saved judgments, not the model's `supported` label. The [final manifest](evidence/v1.3/final-manifest.json) is the authority for completed coverage and provenance; development prefixes are not final results.

The portable file embeds its resources and uses `connect-src 'none'`. Its browser-storage history is separate from the full app's SQLite history. Clearing browser data can remove it; export a report to retain a copy. Embedded answer keys support practice, not secure examinations. Direct `file://` opening cannot be automated by the browser tool; see the [current acceptance record](evidence/v1.3/acceptance.md) for the exact paths exercised.

## Run the full local AI app

Requirements: **Node.js 22.13+ and Ollama 0.34.0+**. The validation host is macOS / Apple M4 Pro / 24 GB memory, with Ollama 0.34.0. Windows and Linux have not been tested. The two application models total approximately **7.234 GB of downloads**, plus dependency storage; download size is not a peak-memory measurement.

1. Install [Node.js](https://nodejs.org) and [Ollama](https://ollama.com/download) if absent.
2. Run `npm run setup`. It checks Ollama 0.34.0+ before downloading, installs locked dependencies, downloads `qwen3.5:9b` and `qwen3-embedding:0.6b`, builds the app, and records/verifies model digests. It starts local Ollama if needed.
3. Run `npm start` and visit <http://127.0.0.1:4317>.

After setup, Mac users can open `Start-TraceLearn.command`. It rebuilds this copy and compares version, hashed installation identity and build fingerprint before reusing a server. A different copy or older build is left running; the launcher selects a free port from 4317–4336 and prints the address. Model weights remain in Ollama's normal directory and are not bundled in the ZIP.

Ollama 0.34.0+ is required for the tested chat `truncate:false` behavior. No API key, cloud account, paid inference, CDN resource or login is required. Initial installation needs internet. After installation, the app and models can operate locally with outbound access restricted to localhost. Source and evaluation evidence are public; imported learning material stays in the local app. There is no hosted inference service.

The application needs only those two models. **Reproducing the new comparison additionally requires `ollama pull qwen3:4b`**, approximately 2.5 GB, for the frozen old configuration. It is not an application dependency. Follow the final manifest's recorded digests and settings when reproducing results.

## Three-minute walkthrough

1. Use **1 · Predict** and answer the SQL NULL question. For the illustrative wrong-answer path, choose **200 and NULL** with high confidence, then inspect **null-where**.
2. Open **2 · Experiment**. Predict which rows survive `value <> 100`, then **Run & check prediction**. The table shows TRUE, FALSE or UNKNOWN for every row and differences from your prediction.
3. Change to `value <> target OR value IS NULL`, predict again and rerun. You can also edit values or explore `NOT IN`.
4. Choose **Try a transfer question**. The question and displayed source match the current experiment, including NOT IN and the second key schema, and open without revealing a previous answer. Restarting Quick tour restores its initial experiment.
5. Export the Lab record with inputs, predictions and recomputed traces. **Notebook** separately reopens quiz attempts and AI answers with their original citations, without another model call. Its learning-report export is separate from the Lab export.
6. For a second experiment, choose **Keys & closure**. Compare A with AD in the first schema, then test whether an extra B is removable.

These are software demonstrations, not evidence of improved learning. Old saved answers retain their original quote-only status; they are not retroactively labeled as support-reviewed.

## Ask questions and import material

**Ask the source** retrieves five passages. Code creates exact excerpt choices; the model writes one concise conclusion containing the requested result and essential reason, citing at most two of those excerpts. A separate call to the same local model reviews whether the requested information is established, the conclusion and its source attribution, and coverage of the applicable conditions. Exact quotation is checked by code; semantic support remains an automated judgment.

The outcomes are `supported` (local checks accepted the answer), `insufficient` (selected sources do not establish a complete answer), and `unverified` (no complete explanation passed the checks). Neither a matched quote nor `supported` guarantees correctness. There are at most two draft/review rounds, four chat calls, and a 180-second answer-request deadline. Cancellation, unavailable models and timeouts return explicit errors; context overflow is rejected rather than silently trimming source text.

Import a text PDF, UTF-8 Markdown or UTF-8 TXT. All files are limited to 10 MB. PDFs are limited to 50 pages; Markdown/TXT to 175,000 UTF-16 code units (a supplementary character such as an emoji uses two). Text imports receive virtual page segments. Scanned, mixed scanned, encrypted, damaged, empty and unsupported files receive errors; OCR is not included. Check multi-column PDF reading order.

For cloze practice, select any passage in **Browse passages**, then **Generate from this passage**. The planner selects an unused eligible sentence and preserves its source and document hash. The answer comes from that sentence; the same `qwen3.5:9b` model proposes only distractors. Exact reconstruction and distinct options are checked before saving; concurrent requests cannot save the same sentence twice. Exhausted passages prompt you to choose another passage or revisit a question.

A narrow SQL option check rejects known non-NULL aliases such as `non-NULL`, `not NULL` and `IS NOT NULL` appearing as competing options. Generation has at most two calls; this quality failure permits one extra repair with a different prompt, for at most three calls total. This is source recall, not a semantic transfer test or independently reviewed assessment. Built-in exercises stay in English to preserve terminology; the interface, built-in source translations and AI answers support English/Chinese.

## What the Lab computes

SQL supports `value <> target`, `NOT (value = target)`, `value <> target OR value IS NULL`, and `value NOT IN (list)`. It accepts 1–6 numeric/NULL rows and 1–8 list entries, preserves duplicate rows and explains why WHERE keeps only TRUE. It is a bounded simulator, not an arbitrary SQL editor.

Keys & closure provides two fixed dependency schemas. Predict candidate key, reducible superkey or neither, then inspect dependency applications and single-attribute removal checks. Results depend on the displayed dependencies; they do not infer universal constraints from sample data or prove every normal form.

The [Lab validation method](evidence/v1.2-lab-method.md) documents 1,600 row-result comparisons with real SQLite and checks of all 24 subsets of the two schemas against a separately implemented finite-relation oracle. This checks code with different algorithms; it is not independent human evaluation of learning.

## Architecture and model settings

```text
React workspace
  |-- deterministic SQL / closure experiments and original exercises
  |-- browser storage: separate Lab and portable practice records
  | same-origin HTTP, localhost only
Node / Express / SQLite
  |-- page-aware imports, document hashes, vectors, attempts and chats
  |-- qwen3-embedding:0.6b + lexical overlap --> five source passages
  |-- program-built exact excerpts --> qwen3.5:9b concise conclusion
  |-- exact-quote validation --> separate same-model support review
  |-- original sentence --> source-recall key + model distractors
  `-- deterministic grading, saved-answer replay and Markdown exports
```

Retrieval weights cosine similarity at 0.75 and query-token overlap at 0.25. It is a heuristic, not a trained reranker. The current generation adapter uses a 16,384-token context, a 1,800-token output limit, `think:false`, `truncate:false`, temperature 0 and seed 42. [local-model.ts](server/local-model.ts) defines full settings; [support-answer.ts](server/support-answer.ts) defines answering/review. [source-recall.ts](server/source-recall.ts) and [practice-generation.ts](server/practice-generation.ts) implement configurable cloze generation and bounded repair.

The frozen [server/ai.ts](server/ai.ts) retains the old Qwen3-4B answer path and shared retrieval/validation helpers. Its constants do not define current production generation. The new experiment compares complete old/current configurations, including changed model weights and review logic; it is not a single-variable ablation.

## Validation and reproducibility

- `npm test`: core, Lab, request recovery, local-model transport, generation, review and isolated HTTP checks. The final acceptance record gives the completed test count.
- `npx tsx scripts/http-check.ts`: separate route-level checks with an isolated SQLite database and local server.
- `npm run build`: TypeScript and production build.
- `npm run prepare:current-review`: checks final raw/review hashes and each saved judgment against its raw record, then writes the v1.3 display projection without rescoring.
- `npm run build:portable`: regenerates both historical and current projections, including those v1.3 checks, then builds the self-contained HTML.
- [v1.3 acceptance](evidence/v1.3/acceptance.md): exact browser, setup, offline, build and delivery checks, including their limits.
- [v1.3 final manifest](evidence/v1.3/final-manifest.json): complete development/holdout coverage, configuration, frozen source and raw-result provenance. Follow this record for the final comparison and reproduction.
- [v1.3 evidence notes](evidence/v1.3/README.md): development history and the distinction between mocked UI checks and real inference.
- [Technical report](submission/TraceLearn-Technical-Report.pdf): method, measured results and limitations.

The original `content/course.ts`, `server/ai.ts` and `evaluation/*` remain frozen. The original 80 cases, 160 requests, errors and saved agent-assisted reviews are historical evidence, not v1.3 performance. Earlier acceptance files describe their own versions. Development prefixes must not be reported as complete final scores.

`npm run evaluate` is the **legacy** evaluation command. Do not overwrite historical results to reproduce a new comparison; use a separate output directory and the configuration in the new final manifest. A separate reproduction needs the additional old model described above. Timing depends on hardware, warm state and workload. The dataset-author Codex agent also performed the saved semantic scoring; this is neither blinded nor independent human assessment. See the [reproduction guide](evidence/v1.3/REPRODUCE.md) for new-output commands that preserve the historical records.

## Data and safety boundaries

The full app stores imported material, generated questions, attempts and chats in `.local/tracelearn.sqlite` by default. Portable quiz attempts and Lab experiments use browser storage. Lab retains the latest 100 valid records per source hash; export recomputes outcomes instead of trusting stored scores. Personal runtime databases are excluded from the source ZIP and submission media.

The server listens on 127.0.0.1 and rejects unexpected Host and Origin headers. It is a single-user application without multi-user authentication. Do not expose it or Ollama through a public tunnel. Installation identity exposes hashes, not an absolute filesystem path.

React renders source/model content as text. Document instructions are untrusted data; representative prompt-injection tests do not guarantee resistance to every attack. Cancellation aborts requests and prevents stale results replacing the current course/question. The Ask cancel control does not submit a replacement request. A response saved immediately before cancellation may already exist in history.

## Troubleshooting

- **Local AI unavailable:** start Ollama, run `npm run setup`, then **Check connection**.
- **Application model missing:** run `ollama pull qwen3.5:9b` and `ollama pull qwen3-embedding:0.6b`.
- **Slow first request:** indexing/model loading take time; later calls can reuse local vectors and loaded weights.
- **No answer passed the checks:** inspect the outcome, narrow the question or inspect the source. An `unverified` explanation is not accepted.
- **Context limit exceeded:** shorten the question or material. The request is rejected rather than silently truncated.
- **Import rejected:** export a text PDF or UTF-8 notes; scanned material needs external OCR.
- **No more practice:** select another passage; the planner avoids repeating source sentences.
- **Port in use:** the Mac launcher selects a free port unless the running installation/build matches. For CLI use `PORT=4321 npm start`.

## AI contribution and report generation

Codex substantially assisted with design, code, original teaching material, tests, evaluation review, visuals and documentation. Qwen runs locally for generated answers and distractors. No independent classroom study, adoption or learning gain is claimed. Separate organizer approval of AI-assisted code authorship has not been obtained. See [AI-DISCLOSURE.md](submission/AI-DISCLOSURE.md) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

To regenerate the report with Python 3.11+, install `scripts/requirements-report.txt` in a virtual environment and run `python scripts/make-report.py` after the complete final evidence is available. It uses saved measurements and actual software screenshots; it does not create evaluation evidence. `python scripts/write-review.py` recounts saved historical judgments only. [architecture.svg](submission/architecture.svg) is the standalone architecture diagram.
