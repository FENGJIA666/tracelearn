# TraceLearn - Portable practice record

Source SHA-256: dadc6ec13c6948bfc7e4ca3cf541802f78e60270e05ae34c7264347c869d179a
This record contains your real local practice attempts. It is not a validated measure of mastery or learning gains.
Portable mode performs deterministic grading. Evidence separates the current configuration comparison from the original experiment; all AI outputs there are saved records, not live inference.

## 1. SQL NULL / diagnostic
Salaries are 100, 200, and NULL. Which rows survive WHERE salary <> 100?
Chosen: 200 and NULL
Correct answer: 200 only
Result: Needs review; confidence: sure
The comparison with NULL is UNKNOWN. WHERE keeps only TRUE, so only 200 survives.
Sources: null-comparison, null-where
Time: 2026-09-15T17:31:52.679Z

## 2. NOT IN / transfer
For a known x = 2, what is the truth value of x <> 1 AND x <> NULL?
Chosen: UNKNOWN
Correct answer: UNKNOWN
Result: Correct; confidence: somewhat
TRUE AND UNKNOWN is UNKNOWN.
Sources: null-not-in, null-logic
Time: 2026-09-15T17:34:34.972Z
