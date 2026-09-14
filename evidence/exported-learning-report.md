# TraceLearn — Evidence of practice

Course: Database foundations
Source SHA-256: dadc6ec13c6948bfc7e4ca3cf541802f78e60270e05ae34c7264347c869d179a
Exported: 2026-09-14T10:19:51.498Z

This is a practice record, not a validated measure of mastery or learning gains. AI-generated explanations may be wrong; consult the quoted source.

Attempts: 2
Correct attempts: 1

## Practice history

### 1. SQL NULL / diagnostic
Salaries are 100, 200, and NULL. Which rows survive WHERE salary <> 100?
Chosen: 200 and NULL
Correct answer: 200 only
Result: Needs review; self-reported confidence: sure
The comparison with NULL is UNKNOWN. WHERE keeps only TRUE, so only 200 survives.
Sources: null-comparison, null-where
Time: 2026-09-14T10:17:32.044Z

### 2. SQL NULL / transfer
Prices are 10, 20, and NULL. Which condition returns 20 and NULL, but not 10?
Chosen: price <> 10 OR price IS NULL
Correct answer: price <> 10 OR price IS NULL
Result: Correct; self-reported confidence: somewhat
IS NULL explicitly includes the missing price; negating an UNKNOWN comparison does not make it TRUE.
Sources: null-where, null-logic
Time: 2026-09-14T10:18:03.585Z

## Local AI questions