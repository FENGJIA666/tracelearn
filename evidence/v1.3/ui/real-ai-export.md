# TraceLearn — Evidence of practice

Course: Database foundations
Source SHA-256: dadc6ec13c6948bfc7e4ca3cf541802f78e60270e05ae34c7264347c869d179a
Exported: 2026-09-15T17:35:40.749Z

This is a practice record, not a validated measure of mastery or learning gains. AI-generated explanations may be wrong; consult the quoted source.

Attempts: 0
Correct attempts: 0

## Practice history

## Local AI questions

### For salaries 100, 200, and NULL, which rows survive WHERE salary <> 100, and why?

#### Claim 1
For salaries 100, 200, and NULL, the WHERE clause salary <> 100 returns only the row with 200 because the comparison for 100 yields FALSE and the comparison for NULL yields UNKNOWN, both of which are filtered out.
> [null-where] SQL uses TRUE, FALSE, and UNKNOWN in its three-valued logic. A WHERE clause keeps a row only when its predicate is TRUE; FALSE and UNKNOWN are both filtered out. For salaries 100, 200, and NULL, WHERE salary <> 100 returns only the row with 200. To include missing salaries, write salary <> 100 OR salary IS NULL.
> [null-comparison] NULL represents missing or unknown information. It is not zero, an empty string, or a value equal to another NULL. Ordinary SQL comparisons involving NULL, including NULL = NULL and NULL <> 5, evaluate to UNKNOWN rather than TRUE or FALSE. Use IS NULL or IS NOT NULL to test missingness.
Model: qwen3.5:9b; response time: 25786 ms
An answer passed automated support checks.
Support outcome: supported
Quotes are selected from the original source and matched exactly. Drafting and a separate review call use the same local model. This is an automated support check, not independent verification or a guarantee of correctness.

### For salaries 100, 200, and NULL, which rows survive WHERE salary <> 100, and why?

#### Claim 1
For salaries 100, 200, and NULL, the WHERE clause salary <> 100 returns only the row with 200 because the comparison for 100 yields FALSE and the comparison for NULL yields UNKNOWN, both of which are filtered out.
> [null-where] SQL uses TRUE, FALSE, and UNKNOWN in its three-valued logic. A WHERE clause keeps a row only when its predicate is TRUE; FALSE and UNKNOWN are both filtered out. For salaries 100, 200, and NULL, WHERE salary <> 100 returns only the row with 200. To include missing salaries, write salary <> 100 OR salary IS NULL.
> [null-comparison] NULL represents missing or unknown information. It is not zero, an empty string, or a value equal to another NULL. Ordinary SQL comparisons involving NULL, including NULL = NULL and NULL <> 5, evaluate to UNKNOWN rather than TRUE or FALSE. Use IS NULL or IS NOT NULL to test missingness.
Model: qwen3.5:9b; response time: 15995 ms
An answer passed automated support checks.
Support outcome: supported
Quotes are selected from the original source and matched exactly. Drafting and a separate review call use the same local model. This is an automated support check, not independent verification or a guarantee of correctness.

### For salaries 100, 200, and NULL, which rows survive WHERE salary <> 100, and why?

#### Claim 1
For salaries 100, 200, and NULL, the WHERE clause salary <> 100 returns only the row with 200 because the comparison for 100 yields FALSE and the comparison for NULL yields UNKNOWN, both of which are filtered out.
> [null-where] SQL uses TRUE, FALSE, and UNKNOWN in its three-valued logic. A WHERE clause keeps a row only when its predicate is TRUE; FALSE and UNKNOWN are both filtered out. For salaries 100, 200, and NULL, WHERE salary <> 100 returns only the row with 200. To include missing salaries, write salary <> 100 OR salary IS NULL.
> [null-comparison] NULL represents missing or unknown information. It is not zero, an empty string, or a value equal to another NULL. Ordinary SQL comparisons involving NULL, including NULL = NULL and NULL <> 5, evaluate to UNKNOWN rather than TRUE or FALSE. Use IS NULL or IS NOT NULL to test missingness.
Model: qwen3.5:9b; response time: 16065 ms
An answer passed automated support checks.
Support outcome: supported
Quotes are selected from the original source and matched exactly. Drafting and a separate review call use the same local model. This is an automated support check, not independent verification or a guarantee of correctness.