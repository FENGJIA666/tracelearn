# Reproduce TraceLearn v1.3

Run commands from the extracted project root, where `package.json` is located. The shell examples use macOS Bash/Zsh. Keep the supplied evidence unchanged and write your observations to new directories under `.local/`.

This guide is a procedure, not a claim that every final check has finished. In the final release, `evidence/v1.3/final-manifest.json` identifies the selected development run, holdout run, saved reviews and their hashes; `evidence/v1.3/freeze.json` identifies the frozen code, models, options and scoring rules. If either is absent or incomplete, do not infer final coverage from a development directory. The final `evidence/v1.3/acceptance.md`, when available, identifies the actual application/browser/offline checks completed.

## 1. Use the application

The full app requires Node.js 22.13+ and Ollama 0.34.0+. It uses only:

| Role | Model |
| --- | --- |
| Current answers and cloze distractors | `qwen3.5:9b` |
| Source embeddings | `qwen3-embedding:0.6b` |

After installing Node.js and Ollama, run:

```bash
npm run setup
npm start
```

Setup installs the lockfile dependencies, checks Ollama's version, downloads the two application models, builds the app and verifies their recorded digests. Downloads require internet. Open `http://127.0.0.1:4317` after startup. The Mac `Start-TraceLearn.command` launcher can select another free port when an existing installation differs; use its printed URL. See the [main README](../../README.md) and [judge walkthrough](../../JUDGE-GUIDE.md).

The portable `submission/TraceLearn-Portable.html` needs neither model. It contains the original practice, deterministic experiments and saved evidence; it does not run live AI. Opening it does not reproduce AI inference or the full app's SQLite history.

## 2. Automated code and HTTP checks

These commands do not repeat the model evaluation. Automated tests include injected/mock dependencies and isolated HTTP fixtures; their success is distinct from real model acceptance.

```bash
mkdir -p .local
npm ci
npm test
npm run build
trace_check_out="$(mktemp -d "$PWD/.local/check-results-XXXXXX")"
npx tsx scripts/http-check.ts --out "$trace_check_out/http-check.json"
```

The HTTP checker starts its own server on a free port with a temporary SQLite database, checks imports, deterministic grading, history/export and request boundaries, then stops that server. Its invalid Ask request is rejected before inference. Always supply `--out`: its historical default is `evidence/http-check.json`.

## 3. Real runtime and context checks

These checks use real installed models and can take minutes. They are not the scored development/holdout experiment. Run one model workload at a time so resource contention does not distort timings.

For HTTP runtime acceptance, choose an unused port other than 4317. In terminal A, from the project root:

```bash
mkdir -p .local
trace_runtime_data="$(mktemp -d "$PWD/.local/runtime-db-XXXXXX")"
PORT=4341 TRACELEARN_DATA="$trace_runtime_data" \
  node --import tsx server/index.ts
```

Wait for the listening message. If 4341 is occupied, choose another port in both commands. In terminal B, also from the project root:

```bash
trace_runtime_out="$(mktemp -d "$PWD/.local/runtime-results-XXXXXX")"
npx tsx scripts/runtime-check-v13.ts \
  --base http://127.0.0.1:4341 \
  --out "$trace_runtime_out/runtime-check.json"
```

This records identity/status, imports an original instruction-interference fixture, checks one answer and one outside-source refusal, creates a cloze, reconstructs its source independently, submits correct and wrong options, and checks history and the Markdown export. It deliberately disconnects one additional Ask and observes history over a 190-second window. It does not retry failed generations. Stop only the test server in terminal A with Ctrl+C when finished.

The saved [runtime record](runtime-check.json), [source review](runtime-review.md) and [isolation proof](runtime-isolation.json) concern **r7**, as their fingerprints state. A run against another configuration is new evidence; it does not rewrite the saved r7 result. API reloads are not browser reload or process-restart tests.

For the separate context check, use a fresh extracted project copy that has no `.local/v13-context-check` directory:

```bash
mkdir -p .local
trace_context_out="$(mktemp -d "$PWD/.local/context-results-XXXXXX")"
npx tsx scripts/context-check-v13.ts \
  --out "$trace_context_out/context-check.json"
```

The script itself isolates SQLite before importing production modules. It makes one support request over five fixed 1,400-character Chinese passages, then one 40,000-character overflow request. Only retrieval is injected; chat calls use the real production adapter. It refuses an existing output or its existing isolation directory, so a new `--out` alone is not a resume mechanism. Use a new extracted copy for another independent run.

The saved [context evidence](context-check.json) and [review](context-review.md) concern the fingerprinted **r8** pipeline. They test source transmission and explicit context rejection, not hybrid retrieval quality. The common-Chinese fixture used about 5,000 prompt tokens per pass; it is not a performance benchmark at the 16,384-token limit. Neither script turns `supported` into semantic correctness: read the full outputs and record your own judgments separately.

## 4. Reproduce the frozen comparison

The comparison additionally needs **`qwen3:4b`**, the frozen old answer model. `qwen3.5:4b` was an earlier development candidate and is not required for the final two-configuration comparison.

```bash
ollama pull qwen3:4b
```

Use the published frozen source and the exact model digests, Ollama version, options and protocols recorded in `freeze.json`. Model tags may change; a matching name alone is insufficient. Do not edit a freeze or lock to bypass a mismatch. The runner reports a missing model or mismatched identity before a holdout case is opened. Hardware and runtime differences can still affect outputs and timings.

The commands below use the v2 scoring protocol, which covers changed model weights and full pipeline configurations. The early development example printed by `evaluate-v13.ts --help` still names the original v1 protocol and an existing evidence directory; do not copy that example over the supplied records.

First create a new destination and compare the current metadata with the published freeze. `--describe-config` contacts local Ollama for metadata, but does not read case files or run inference. The validator below imports only the runner's pure integrity helpers.

```bash
mkdir -p .local
trace_repro_dir="$(mktemp -d "$PWD/.local/evaluation-repeat-XXXXXX")"
trace_eval_common=(
  --documents evaluation-v13/documents.json
  --dataset-lock evaluation-v13/dataset-lock.json
  --scoring-protocol evaluation-v13/scoring-protocol-v2.json
  --scoring-protocol evaluation-v13/scoring-protocol-v2.md
  --deadline-ms 180000
  --modes frozen-grounded,supported
)
npx tsx scripts/evaluate-v13.ts "${trace_eval_common[@]}" \
  --describe-config > "$trace_repro_dir/identity.json"
node --import tsx --input-type=module - "$trace_repro_dir/identity.json" <<'JS'
import {readFileSync} from 'node:fs';
import {validateFreeze} from './scripts/evaluate-v13-core.ts';
const freeze=JSON.parse(readFileSync('evidence/v1.3/freeze.json','utf8'));
const current=JSON.parse(readFileSync(process.argv[2],'utf8')).identity;
validateFreeze(freeze,current);
console.log('Current identity matches the published freeze.');
JS
```

Continue only if that comparison succeeds. This checks the model digests, tag defaults/capabilities, Ollama version, runner and pipeline hashes, options, deadline, dataset lock and protocol hashes. An environment override such as `TRACELEARN_ANSWER_MODEL` must also match the frozen model. The runner creates its own isolated data directory before loading storage code.

Validate and then run the development split:

```bash
node evaluation-v13/verify.mjs --development
npx tsx scripts/evaluate-v13.ts "${trace_eval_common[@]}" \
  --split development --cases evaluation-v13/development.json \
  --freeze evidence/v1.3/freeze.json \
  --out "$trace_repro_dir/development" --validate-only
npx tsx scripts/evaluate-v13.ts "${trace_eval_common[@]}" \
  --split development --cases evaluation-v13/development.json \
  --freeze evidence/v1.3/freeze.json \
  --out "$trace_repro_dir/development"
```

`--validate-only` checks inputs/configuration and performs no inference. Development mode does not itself enforce the freeze, which is why the explicit identity comparison above is required.

**Only after the holdout has been released with the final freeze**, reproduce it into a different new output directory:

```bash
npx tsx scripts/evaluate-v13.ts "${trace_eval_common[@]}" \
  --split holdout --cases evaluation-v13/holdout-sealed/questions.json \
  --freeze evidence/v1.3/freeze.json \
  --out "$trace_repro_dir/holdout" --validate-only
npx tsx scripts/evaluate-v13.ts "${trace_eval_common[@]}" \
  --split holdout --cases evaluation-v13/holdout-sealed/questions.json \
  --freeze evidence/v1.3/freeze.json \
  --out "$trace_repro_dir/holdout"
```

The holdout gate checks the freeze before opening case contents. It requires the full split and both modes; `--case`, `--limit` and single-mode holdout runs are refused. A full split has 40 cases × two configurations, so two completed splits have 160 requests. This is expected coverage, not proof that a particular directory is complete.

The new output contains a manifest, frozen source snapshot, raw JSONL records and structural summaries. Matching interrupted runs can resume in the same directory with the identical command: complete exact keys, **including errors**, are skipped. Changed code, model digests/defaults, data, settings or runner require a new output directory. Preserve unsuccessful outputs; do not rerun individual failures and replace them with favorable results.

The final development and holdout raw outputs and saved reviews are historical observations of their recorded runs. Reproduction does not modify them. Once the holdout is public, anyone can inspect and repeat it, but its original **not-used-for-tuning-before-first-run** status applies only to our recorded original run. A later run after reading the questions or tuning on them is not another fresh holdout.

Score meaning using the [v2 protocol](../../evaluation-v13/scoring-protocol-v2.md), retaining your new review separately. Matching substrings, valid JSON, exact quotes and a runtime `supported` label are not semantic scores. Errors and `unverified` outcomes are not credited as correct refusals. The dataset-author Codex agent also performed our saved semantic scoring; it is neither blinded nor independent human assessment or evidence of student learning gains. See the [dataset boundary](../../evaluation-v13/README.md).

Do **not** use `npm run evaluate` for this reproduction: it is the legacy command with historical output paths. Preserve the original `evaluation/` dataset, all 160 original records and their saved reviews. They describe the original experiment, not this new comparison.

## 5. Process-level offline reproduction on macOS

Install dependencies and models before disconnecting. This procedure uses the checked-in [sandbox policy](../../scripts/offline.sb) to deny outbound traffic except localhost **for the app and Ollama processes**. It does not disable networking for the whole computer or browser. `sandbox-exec` is a macOS-specific prerequisite; this is not Windows/Linux acceptance.

Use a dedicated test session in which you have deliberately stopped your existing Ollama daemon and no other job needs it. Do not reuse an already running daemon for this test: the cold check requires an empty model runtime. Start Ollama in terminal A:

```bash
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 \
  sandbox-exec -f scripts/offline.sb ollama serve
```

Start the app with a fresh DB and an unused non-4317 port in terminal B:

```bash
trace_offline_data="$(mktemp -d "$PWD/.local/offline-db-XXXXXX")"
PORT=4343 TRACELEARN_DATA="$trace_offline_data" \
  sandbox-exec -f scripts/offline.sb node --import tsx server/index.ts
```

After both listeners are ready, run in terminal C:

```bash
trace_offline_out="$(mktemp -d "$PWD/.local/offline-results-XXXXXX")"
npx tsx scripts/offline-check-v13.ts \
  http://127.0.0.1:4343 "$trace_offline_out/offline-check.json"
```

This script takes two positional arguments, not `--base`/`--out`. It records external `curl` denial under the same policy, identity/status, the initially empty model list, two real Ask outputs and later allocation metadata. Its cold definition is restarted Ollama with no loaded model and a fresh course/vector cache; the warm request repeats the same question. Verify the actual answers separately. An allocated-memory snapshot is not a peak-memory measurement. Stop only the two foreground test processes after recording your results, then restore your usual local services as needed.

## 6. Interpret UI evidence separately

Follow the [judge walkthrough](../../JUDGE-GUIDE.md) in the actual application, including source navigation, a fresh transfer attempt, editable Lab inputs, saved history and exports. Check both a desktop layout and a narrow viewport. Screenshots are evidence of the shown state, not proof of every interaction or inference result.

The [browser evidence notes](ui/README.md) distinguish the real isolated-backend navigation checks from the explicitly mocked API checks used to control delays and cancellation races. A screenshot marked MOCK must not be presented as a real-model result. The final acceptance record identifies any later real-model screenshots, portable HTTP checks and direct-file limitations. A build, `npm test`, or saved JSON file alone is not visual acceptance.

Command interfaces in this guide were checked against the actual `--help` output of `evaluate-v13.ts`, `runtime-check-v13.ts` and `context-check-v13.ts`, and the argument parsing of `http-check.ts` and `offline-check-v13.ts`, which do not provide a help mode. No models were run to write this document.

## Check release readiness without creating a package

With Python 3.11+, after final scoring and application acceptance, the release manifest must contain `verification.completed: true`, the freeze SHA-256, and the final raw/review file hashes. Run:

```bash
python3 scripts/package.py --check-only
```

The gate itself can be checked without real evaluation data using `python3 scripts/package-guard-check.py`; it creates only synthetic temporary fixtures.

The release-readiness command checks both splits for exactly 40 cases × two configurations, 80 saved reviews, each judgment's raw-line hash and run identity, and packaged runtime files against the freeze. It also rejects included symlinks, credential-like filenames and runtime database files. It excludes `.local`, dependencies, generated build directories and Git metadata while preserving the historical evaluations. Filename checks are a safeguard, not a general secret scanner.

The check does not write a ZIP or change `MANIFEST.sha256`. Only after it passes should the release maintainer run `python3 scripts/package.py`; archive creation uses a staged file and checks that the bytes written match the source manifest. A package still needs its own extraction/download checks. Do not mark those complete just because this gate passed.
