# TraceLearn

**Learning that can show its work.**

[Try the portable practice](https://github.com/FENGJIA666/tracelearn/releases/download/v1.2.0/TraceLearn-Portable.html) · [Read the technical report](submission/TraceLearn-Technical-Report.pdf) · [Download the complete package](https://github.com/FENGJIA666/tracelearn/releases/download/v1.2.0/TraceLearn-Complete-v1.2.0.zip) · [Judge walkthrough](JUDGE-GUIDE.md) · [Devpost project](https://devpost.com/software/tracelearn-learning-that-can-show-its-work)

![The real TraceLearn learning workspace](submission/01-learning-workspace.png)

TraceLearn is a local-first learning workspace for university students. **Predict an answer, inspect its source, change the example, and try a fresh transfer question.** The Counterexample Lab makes the explanation testable: edit SQL values and conditions to see which rows survive, or select attributes to follow a key-closure calculation. These computations use deterministic code, not generated reasoning. A local language model separately supports source questions and imported-note practice, with checked quotes and visible limitations.

The worked course covers SQL NULL, aggregates, NOT IN, candidate keys, functional dependencies, closures, 2NF, 3NF/BCNF, decomposition, and LEFT JOIN. It contains 20 original passages and 10 diagnostic/transfer pairs. The course and tests are original contest work; no private student files are included.

## Try the portable practice first

[Download TraceLearn-Portable.html](https://github.com/FENGJIA666/tracelearn/releases/download/v1.2.0/TraceLearn-Portable.html) (under 0.5 MB). This single file contains the same React workspace, 20 original questions, editable SQL/key experiments, source passages, review suggestions and exports. It needs no Node.js, model download or API key for those features. Download it and open it in a browser. If local-file opening is restricted, serve the extracted `submission` folder with `python3 -m http.server 4329 --bind 127.0.0.1 --directory submission` and visit <http://127.0.0.1:4329/TraceLearn-Portable.html>.

The **Quick tour** connects Predict → Experiment → Transfer → Reflect & export. Steps open the real application state; the app does not fill in predictions or answers for you. Lab predictions are kept separately from quiz results, and a fresh transfer question opens without revealing a previous answer.

**Evidence is recorded, not live AI.** Start with the supported-answer, refusal and retained-failure examples, then browse all 160 frozen requests by split and case type. Both methods, references, quotes, source passages and saved agent-assisted judgments remain inspectable. Live inference and importing your own notes require the full local app below.

The portable file has embedded resources and a `connect-src 'none'` policy. Interactions and actual report download were verified through a localhost static preview; direct `file://` launch could not be automated because the browser tool blocks that scheme. Practice history uses browser storage when allowed and is separate from the full app's SQLite history. Browser data clearing can remove it; export a report to keep a copy. Embedded answer keys are for practice, not secure examinations.

## Run the full local AI app

Requirements: Node.js 22.13 or newer, Ollama, approximately 3.2 GB of model downloads, plus dependency storage. Tested on macOS / Apple M4 Pro / 24 GB memory. Windows and Linux were not tested.

1. Install Node.js from https://nodejs.org and Ollama from https://ollama.com/download if absent.
2. In this directory, run `npm run setup` once. It starts a local Ollama process if needed, downloads the two named models, installs locked packages, builds the app, and records/verifies model digests.
3. Run `npm start` and visit http://127.0.0.1:4317.

On the tested Mac, `Start-TraceLearn.command` provides a double-click launcher after setup. It rebuilds this copy, then compares version, hashed installation identity and build fingerprint before reusing a server. A different copy or an older build is left running; the launcher chooses a free port from 4317–4336 and prints the actual address. It waits for the matching app before opening the browser. Model files are kept in Ollama's normal model directory and are not bundled in the source ZIP.

No API key, cloud account, paid inference, external font, CDN asset, or user login is required. Initial installation needs internet. Afterwards the app and model processes can operate with outbound network access restricted to localhost. The source and evaluation evidence are public in this repository. The release includes a complete source package and a separately downloadable technical report. The application itself runs locally; there is no hosted inference demo.

## Three-minute walkthrough

1. Use **1 · Predict** and answer the SQL NULL question. For the illustrative wrong-answer path, choose **200 and NULL** with high confidence, then inspect **null-where**.
2. Open **2 · Experiment**. Predict which rows survive `value <> 100`, then **Run & check prediction**. The table shows TRUE, FALSE or UNKNOWN for each row and highlights differences from your prediction.
3. Change the condition to `value <> target OR value IS NULL`, make a new prediction, and rerun. You can also change the values or explore `NOT IN`.
4. Choose **Try a transfer question** and answer independently. This opens a fresh attempt, even if the question was answered earlier.
5. In **Lab**, export the experiment inputs, predictions and recomputed traces. In **Notebook**, inspect review suggestions and export the separate quiz/AI learning report.
6. For a second example, switch Lab to **Keys & closure**. Compare A with AD in the first schema, then test whether an extra B is removable.

These demonstration actions are software tests, not evidence of improved student learning.

## Import your own material

PDF with extractable text, UTF-8 Markdown, or UTF-8 TXT. Maximum 10 MB and 50 PDF pages; text is limited to 175,000 characters and assigned virtual page segments. Scanned, mixed scanned, encrypted, damaged, empty, and unsupported files receive explicit errors. OCR is not implemented. Multi-column PDF reading order may need manual checking.

Imported courses support source questions and AI-assisted verbatim cloze practice. Select any passage in **Browse passages**, then choose **Generate from this passage**. The planner chooses an unused eligible sentence from that passage, preserves the document hash and citation, and skips already-used statements. If all eligible sentences are used, it asks you to choose another passage or revisit an existing question. API callers may omit `sectionId` to scan the whole document; generation is no longer limited to the first five passages.

The app accepts a question only when the keyed option exactly reconstructs the selected source sentence and all four options are distinct. Simultaneous requests cannot save duplicate questions for the same sentence. These are source-recall exercises, not conceptual transfer tests or independently reviewed questions. Early free-form question generation produced an all-incorrect option set, so the shipped generation path was deliberately narrowed. Built-in exercises stay in English to preserve technical terminology; the interface, built-in source translations, and AI responses support English/Chinese.

## What the Lab computes

SQL supports four fixed predicates: `value <> target`, `NOT (value = target)`, `value <> target OR value IS NULL`, and `value NOT IN (list)`. The interface accepts 1–6 numeric/NULL rows and 1–8 list entries. It preserves duplicate rows and shows why WHERE keeps only TRUE. This is a bounded simulator, not an arbitrary SQL editor.

Keys & closure provides two original dependency schemas. Select attributes, predict whether they form a candidate key, a reducible superkey or neither, then inspect each applied dependency and single-attribute removal check. Results are conditional on the displayed dependencies; they do not infer universal constraints from a sample table or prove every normal form.

The [lab validation method](evidence/v1.2-lab-method.md) explains 1,600 row-result comparisons with real SQLite and checks of every subset of both schemas against a separately implemented finite-relation oracle. This is independent computation for checking the code, not independent human evaluation of learning.

## Architecture

```text
React reading workspace
  |-- fixed SQL / attribute-closure model: editable inputs, deterministic traces
  |-- browser storage: separate lab predictions and portable practice
  | same-origin HTTP, localhost only
Node / Express
  |-- SQLite: courses, source hashes, vectors, attempts, question records
  |-- PDF.js / UTF-8 parser: page-aware source passages
  |-- lexical overlap + cosine similarity --> top five passages
  |-- Ollama qwen3-embedding:0.6b --> local vectors
  |-- Ollama qwen3:4b --> structured answer / generated question
  |-- Zod + exact-quote matching + echo/planning rejection
  `-- deterministic exercise grading + Markdown report
```

The rank is 0.75 cosine similarity + 0.25 query-token overlap. This is an inspectable hybrid heuristic, not a trained reranker. For grounded answers the model sees only the top five passages. The comparison baseline sees all 20 passages. Both use the same model, prompt, schema and quote validator. Neither method can prove semantic entailment merely by matching a quote.

`server/ai.ts` defines the frozen model tags and inference parameters. `evaluation/model-manifest.json` records actual model digests and Ollama version. `evaluation/dataset-lock.json` fixes the 80-case dataset. The pilot and its observed defects are retained separately from the final run.

## Validation and reproducibility

- `npm test`: 48 automated checks passed for v1.2, including unit and isolated HTTP integration tests. Coverage includes SQLite differential checks, the independent FD oracle, stored-record validation, stale-request handling, selected-passage generation, concurrent duplicate prevention and installation identity, plus the earlier core checks.
- `npx tsx scripts/http-check.ts`: isolated SQLite database and local server; validates user routes, hidden answers, input checks, origin restrictions, history and export.
- `npm run build`: TypeScript and production build.
- `npm run build:portable`: regenerate the display projection of frozen records and create the self-contained HTML.
- `evidence/v1.2-acceptance.md`: current browser, build and delivery evidence. Earlier `evidence/acceptance.md` and `evidence/v1.1-acceptance.md` are historical records, not the current submission status.
- `evidence/v1.2-lab-method.md`: deterministic Lab validation, assumptions and reproduction commands.
- `npm run evaluate`: runs missing evaluations and regenerates summary. Existing results are not overwritten. To independently rerun, copy the code to a fresh directory and archive `evaluation/raw-results.jsonl` first.
- `evaluation/raw-results.jsonl`: accepted final model output, retrieved sources, timings and available retry records; rejected calls retain error records.
- `evaluation/semantic-review.json`: agent-assisted review, explicitly not an independent human study.
- `submission/TraceLearn-Technical-Report.pdf`: self-contained explanation and measured results.

To reproduce the final measurements, use the recorded model digests and configuration. Inference timing depends on hardware, warm state and other workload. This small, author-created benchmark is not a general measure of educational effectiveness.

## Data and safety boundaries

The full app's imported material, generated questions, quiz attempts and chats live in `.local/tracelearn.sqlite` by default. Portable quiz attempts and Lab experiments use browser storage; Lab keeps the latest 100 valid input/prediction records per source hash. Its export recomputes outcomes rather than trusting stored scores or traces. Browser clearing can remove these records, so export to retain them. No personal runtime database is included in the source ZIP or submission media.

The server listens on 127.0.0.1 only and rejects unexpected Host and Origin headers. This is a single-user local application; no multi-user authentication is implemented. Do not expose this server or Ollama through a public tunnel. Installation identity exposes hashes, not an absolute filesystem path.

React renders model and document content as text. Documents cannot run application code. Instructions embedded in source text are treated as untrusted; prompt-injection resistance is tested on representative cases, not guaranteed against all attacks. Cancellation aborts the model request and prevents a partial answer from being saved; HTTP success immediately before cancellation may already have been persisted.

## Troubleshooting

- **Local AI unavailable**: start Ollama, run `npm run setup`, then **Check connection**.
- **Model missing**: `ollama pull qwen3:4b` and `ollama pull qwen3-embedding:0.6b`.
- **Slow first request**: first indexing and model loading take longer; subsequent requests reuse local vectors and model memory.
- **Unverifiable response**: the model failed output checks twice. Ask a narrower question; the failed answer is not accepted.
- **Import rejected**: export the source as a text PDF or UTF-8 notes; scanned files need OCR outside this app.
- **No more questions in this passage**: pick another passage; the planner deliberately avoids repeating the same source sentence.
- **Port in use**: the Mac launcher reuses only its own matching installation/build and otherwise selects another local port. With the CLI use `PORT=4321 npm start`.

## AI contribution and limitations

Codex assisted with concept design, implementation, original course and question drafting, test design, visual composition and documentation. Qwen generates runtime responses. Deterministic tests and agent-assisted content checks were used; no independent classroom study, real-user adoption claim or measured learning gain is asserted. The competition encourages AI projects; explicit organizer approval of this development workflow has not been obtained. See `submission/AI-DISCLOSURE.md` and `THIRD-PARTY-NOTICES.md`.

## Report regeneration

The finished PDF and actual screenshots are included. To regenerate the report on a machine with Python 3.11+, install `scripts/requirements-report.txt` in a virtual environment, then run `python scripts/make-report.py` after the complete 160-request summary exists. The script uses the included actual screenshots and saved review judgments; it does not create new evaluation evidence. `python scripts/write-review.py` only recounts the saved agent-assisted judgments. `submission/architecture.svg` is a standalone vector architecture diagram.

Version 1.2 leaves `server/ai.ts`, the original course and all `evaluation/*` files unchanged from v1.1. The new planner wraps the existing generator with a selected source sentence; it does not tune the answering pipeline or change old benchmark results. The earlier narrowing to source-derived cloze is recorded in `evaluation/answer-pipeline-preservation.json`.
