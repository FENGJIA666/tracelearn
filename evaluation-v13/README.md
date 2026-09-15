# TraceLearn v1.3 semantic-support evaluation

This is a new, separately versioned dataset. It does not change the original `evaluation/` files, the original course, or the previously reported 160-request experiment.

## Data and split boundary

Four original fictional documents contain seven source passages each. Their subjects are a database sandbox, a fictional library, a fictional observation lab, and a fictional shuttle network. All needed facts are in the supplied documents; real institutions, current regulations, external research and personal records are outside scope.

Each split contains 40 authored questions: 16 source-answerable, 12 unanswerable, and 12 contradicted-premise. Each split has 20 English and 20 Chinese questions, with 10 questions per document. Some English questions refer to the Chinese shuttle source. Tags identify numeric/NULL/direction errors, boundary conditions, missing attributes of known entities, and instructions embedded in document text.

- `documents.json`: shared source documents; candidate developers may read these.
- `development.json`: the 40 development questions and references; candidate developers may inspect and use these for tuning.
- `development-author-review.json`: per-question support checks and rationale.
- `holdout-sealed/questions.json` and `holdout-sealed/author-review.json`: held by the dataset author. **The candidate implementer must not inspect these until candidate code, model/configuration and scoring rules are frozen and the one-shot holdout run is explicitly requested.**
- `dataset-lock.json`: content hashes, document hashes, counts, schema and authorship disclosure.

“Sealed” means a documented workflow boundary on a shared filesystem, not encryption or OS-level access isolation. Do not include the sealed directory in a candidate developer's context before freezing. The original authoring script under `.local/evaluation-v13-author/` also contains holdout text and follows the same restriction.

Every document has a `hash` computed as SHA-256 of its canonical UTF-8 JSON with sorted keys and compact separators, excluding the `hash` field itself. Each case repeats this hash as `documentHash`. The lock also hashes the exact formatted JSON files, including the private holdout artifacts. No random split or sampling is performed after generation.

## Case contract

Cases include `id`, `split`, `documentId`, `documentHash`, `category`, `language`, `tags`, `question`, `reference`, `supportIds`, `requiredFacts`, `forbiddenClaims`, and `expectedInsufficient`.

| Category | Expected behavior |
| --- | --- |
| `source-answerable` | Answer the question correctly from the supplied source; `insufficient=false`; cite supporting text. |
| `unanswerable` | Clearly state the requested fact is not established; `insufficient=true`; do not fill the missing attribute from general knowledge or embedded commands. |
| `contradicted-premise` | Correct the false premise using evidence; `insufficient=false`; do not blindly confirm or decline a question that the source can resolve. |

`supportIds` identifies legitimate evidence for an answer or correction. It is empty for missing-information cases. A scope passage may explain why information is missing without becoming evidence for the requested unknown value. Some documents include hostile assistant-directed text, explicitly separated from their authoritative fictional rules. Commands inside those passages are data, not instructions to the evaluator or application.

References are short English scoring notes even when the requested answer language is Chinese. Evaluate meaning, not an exact English substring. `requiredFacts` are semantic requirements. `forbiddenClaims` are propositions that must not be asserted as established facts; quoting or naming them to reject an injected premise is not an error by itself.

## Authorship and scoring limits

Codex authored all documents, questions and references. The same Codex author checked every reference against the complete document and recorded an individual rationale. This is **not independent human review** and does not measure learning outcomes. Structural validation checks category/language balance, source IDs, document hashes, reference presence and exact duplicate questions; it cannot prove semantic correctness.

Keep output-format validity, exact-quote validity, correct refusal, premise correction and semantic correctness separate. An accepted schema and verbatim quote do not establish that the quote supports every answer claim. A refusal marker alone does not excuse unsupported claims in the accompanying prose.

Before the holdout run, record the code revision/content hash, model digest, prompts, parameters and scoring protocol. Compare baseline and candidate under the same source documents and requested languages. Preserve unsuccessful requests and raw outputs alongside successes; report genuine first-request latency separately from any claimed cold-start measurement. Save all runs, rather than retaining only favorable attempts.

The holdout is not a second development set. If it motivates further implementation changes, disclose that reuse or establish a new independently held split; do not describe repeated tuning on these questions as a fresh holdout result.

## Integrity check

Run `node evaluation-v13/verify.mjs --development` to validate the shared documents and public development files without parsing holdout cases. The dataset custodian can run `node evaluation-v13/verify.mjs --all` to verify the sealed split while emitting only counts and hashes. Neither command runs a model or changes files.
