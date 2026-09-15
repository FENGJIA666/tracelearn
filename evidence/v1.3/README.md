# Version 1.3 evidence

This directory preserves development attempts as well as final verification. No model-produced “supported” label is treated as a correctness score. The dataset-author Codex agent also performed the saved semantic review. This is neither blinded nor independent human assessment or a classroom study.

## Development history

- `development-probes/`: six diagnostic examples that exposed false claims with real quotations, numerical transcription mistakes and avoidable failures. Earlier exploratory attempts lack a complete source snapshot; their reproduction limits are stated there.
- `development-run/`: stopped at 18 records after an unrelated runtime audit found a quote-padding defect and response-body timeout classification issue. The runner refused to continue after the source fingerprint changed.
- `development-r2/`: first ten development cases under the old 4B model, using claim-level drafting and a separate same-model review.
- `development-r3/`: the same ten development cases with Qwen3.5-4B. This changes model weights, tag defaults and explicit runtime settings; it is not a single-variable ablation.
- `development-r4/`: the same ten cases with exact source excerpts selected by ID, at most two claims, and per-claim citation review. Failed and unsupported outputs are retained.
- `thinking-probe/`: two Qwen3.5-4B thinking-mode requests exceeded the 180-second deadline. Empty/truncated output, errors and the corrected reproduction script are retained; neither request delivered an answer.
- `development-r5/`: Qwen3.5-9B, 16k context, exact excerpt choices and up to two claims; 8/10 strict candidate successes on the examined prefix.
- `development-r6/`: one concise conclusion and a shorter review protocol; 9/10 candidate successes on the same examined prefix. An unrequested necessary-method claim remained a failure.

These prefixes were used to make development decisions. They are not complete 40-case results, fresh test sets, or evidence of out-of-sample performance. The versioned development-run directories retain source snapshots, configurations, raw HTTP model requests/responses and saved semantic judgments; the earlier exploratory exceptions are noted above. Existing records are never replaced by a later attempt.

## Complete development runs

`development-r7/` contains all 40 development questions in both configurations: 80 requests. The saved author/Codex review scored the previous configuration 20/40 and the candidate 34/40. This was development, not a holdout. Six candidate cases failed strict task success, including omitted restrictions, unsuccessful refusals, status/prose disagreement and disputed or incorrect attribution. A separately requested Codex reading identified a plausible alternative interpretation of the extra clause in case 10; the [adjudication note](development-r7/adjudication-note.md) preserves that disagreement without overwriting the original scores. It does not become a strict success.

`development-r8/` is the **selected final development configuration**: Qwen3.5-9B with the one-conclusion pipeline, reasoned answerability checks for empty drafts, applicable-condition coverage and source-attribution review. Its complete 80-request [saved review](development-r8/SEMANTIC-REVIEW.md) records 20/40 strict successes for the previous configuration and 38/40 for the candidate. The two candidate failures remain visible: case 08 adds an unsupported JOIN suggestion; case 17 ends unverified instead of delivering a justified refusal. Of the 80 saved judgments, 59 reuse an exactly matching prior semantic payload after current record/identity/hash checks, and 21 were newly read or reassessed. This is not 80 new independent judgments.

`development-r9-probe/` tested a narrower first draft using the top three passages, with all five available to review and to a retry. It contains only three preselected development cases in both configurations. The [saved review](development-r9-probe/SEMANTIC-REVIEW.md) found that it did not resolve the two target failures; the candidate passed 1/3 of that selected subset. Case 39 recovered after the expanded retry. **This experiment was rejected and the exact r8 pipeline restored.** Its 1/3 subset result is not comparable to a complete-set accuracy rate, and progressive three-to-five passage drafting is not the adopted application behavior.

The [freeze](freeze.json) pins the adopted r8 code, model identities, options, runner and scoring protocol before the first holdout run. Development was used for tuning, so 38/40 is a development result, not held-out accuracy or an expected competition score. The final manifest will identify completed development and one-shot holdout coverage; earlier runs never substitute for it. No final holdout score is asserted in these development notes.

## Product verification

- `ui/learning-navigation.json`: actual compiled app with a real isolated SQLite backend; no AI generation required.
- `ui/acceptance.json`: actual Chrome interaction with an explicitly mocked API to control delays, cancellations and display states. It does not establish model quality or local inference success.
- `runtime-check.json` and `runtime-review.md`: real isolated r7 local API run, three normal generations and one cancelled request observed over 190 seconds; original sources and full responses retained.
- `context-check.json` and `context-review.md`: real r8 inference over five long Chinese passages, with precise first/last citations; a separate 24,031-token request was explicitly rejected against the 16,384-token context. Fixed retrieval tests transport/context boundaries, not hybrid retrieval quality.
- `tokenizer-metadata.json`: metadata from the pinned model artifacts; there is no separately identified tokenizer version.
- `cover-provenance.json`: designed title card edited with built-in image generation; this is not a screenshot.
- `package-guard-check.json` and [package-gate notes](PACKAGE-GUARD.md): 16 checks with synthetic temporary fixtures; separate from final real archive acceptance.
- `model-choice.json`: official model metadata and development selection history. Download size and advertised context are not measured peak memory or application context settings.

The original `evaluation/` dataset, results and frozen `server/ai.ts` remain historical evidence. New development and held-out material live in `evaluation-v13/`; the holdout is opened only after a recorded implementation/configuration freeze. Files share a local filesystem, so this is procedural isolation, not cryptographic blinding.

## First frozen holdout completed

The selected r8 configuration scored **34/40** strictly correct, against **18/40** for the previous configuration. Current delivery was 39/40, with 4 definite unsupported accepted responses; six tasks failed the strict rule. One comparator semantic judgment remains unresolved because its source wording is ambiguous; it earns no strict-correct credit and its unsupported status is not forced to zero or one. The [full saved review](holdout-run/SEMANTIC-REVIEW.md) explains every record and denominator. The dataset author also performed the Codex semantic review; this was not blinded or independent human review.

Both model and pipeline differ between configurations. The original experiment remains unchanged. No holdout-guided implementation changes or additional holdout trials were made. Shared-machine latency conditions, including short dependency and mocked-test work, are disclosed in [ambient-work-note.json](holdout-run/ambient-work-note.json).
