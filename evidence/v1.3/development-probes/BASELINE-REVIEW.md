# Six targeted baseline development probes

Executed once on the real local Qwen runtime through the frozen `answer(..., 'grounded')` function. Each synthetic course used an isolated store under this audit directory. No new holdout files were accessed. Runtime was 3.16–5.97 seconds per case, including retrieval and any built-in retry; six cases took about 28.1 seconds in total.

| Authored development case | Observed current-runtime result | Review |
| --- | --- | --- |
| SQL NOT UNKNOWN | UNKNOWN, exact source quote | Complete and correct. |
| A → B, B → C; relation universe omitted | Asserted A is not a candidate key | Unsupported negative: the missing universe is not proof of non-key status. |
| R(A,B,C), only A → B and B → C | 502; no accepted answer | Answerable positive control lost by the pipeline. |
| Wages 120, 240, NULL; wage <> 120 | Wrote “120, 2:40, and NULL”; quoted 240 correctly | Numeric corruption survived quote validation. The selected surviving row remained 240. |
| AVG of 8, 14, NULL | 502; no accepted answer | Valid derived-number control lost by the pipeline. |
| U → V reverse implication; explicitly request a counterexample | Correct “no” with definition; no counterexample | Core fact correct, request incomplete. |

All four accepted responses had exact source quotations. Therefore quotation membership alone did not distinguish these failure modes. This intentionally targeted six-case set is development evidence, not an unbiased model benchmark, independent human validation, or a claimed competition score improvement.

`baseline-inputs.json` preserves the six actual inputs and expected outcomes. `baseline-results.json` preserves the success objects, raw successful-attempt outputs available from the frozen function, timings, and error statuses. The two terminal errors did not expose their failed candidate bodies; those bodies were not captured. Their precise cause must remain unknown rather than being labeled specifically a quote, JSON, or semantic failure. `baseline-review.json` records the Codex-assisted logic review and independent deterministic quote-membership checks.

The original `reviewer-probes.json` is a different, unexecuted component-test proposal: it pairs authored candidate answers with expected support-review outcomes. No support-reviewer model calls were made in this audit window. Do not mix it into the six actual baseline runs.

## Implications for the new runtime

1. Audit the whole requested answer: a correct yes/no response can omit the requested witness, example, or calculation.
2. Keep absence of a prerequisite separate from a negative conclusion. A relation universe and dependency assumptions must be established before key status can be decided.
3. Link each claim to exact source evidence and question premises; corrupted quantities in the claim do not become valid because a separate quote contains the right number.
4. Retain valid derivation. AVG 11 is absent from the input/source strings but is mathematically supported. A small hypothetical counterexample can also be a legitimate logical construction instead of a new factual claim about the user's data. Pure number-membership gates would reject these useful explanations.
5. Preserve failed candidate outputs in the new runtime. Otherwise diagnosis of a final unverified outcome loses the very evidence needed to improve it.

The proposed semantic reviewer has not been tested here. The root runtime development and untouched held-out evaluation must establish whether the new checks reject these errors without excessively rejecting correct reasoning.
