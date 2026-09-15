# TraceLearn — Counterexample Lab record

Saved inputs and predictions, followed by deterministic recomputation. These are practice records, not a mastery score or evidence of learning gains.
The bounded SQL truth model is differential-tested against SQLite; it is not an arbitrary SQL engine. Key traces are relative to the stated functional dependencies. No model-generated reasoning is used in these traces.

## 1. SQL three-valued logic
Record ID: 70c53439-6dab-4dd9-9116-fc56bc58251a
Experiment schema version: 1
Time: 2026-09-15T17:32:36.671Z
Source SHA-256: dadc6ec13c6948bfc7e4ca3cf541802f78e60270e05ae34c7264347c869d179a

Predicate: value <> 100 OR value IS NULL
| Row | Value | Predicted kept | Truth | Actually kept |
| --- | --- | --- | --- | --- |
| 1 | 100 | false | FALSE | false |
| 2 | 250 | true | TRUE | true |
| 3 | NULL | true | TRUE | true |
Prediction matches: true
Sources: null-comparison, null-where, null-logic, null-not-in

## 2. SQL three-valued logic
Record ID: 7156260e-162c-4314-914f-2d16767e5d29
Experiment schema version: 1
Time: 2026-09-15T17:33:19.243Z
Source SHA-256: dadc6ec13c6948bfc7e4ca3cf541802f78e60270e05ae34c7264347c869d179a

Predicate: value NOT IN (100, NULL)
| Row | Value | Predicted kept | Truth | Actually kept |
| --- | --- | --- | --- | --- |
| 1 | 100 | false | FALSE | false |
| 2 | 250 | false | UNKNOWN | false |
| 3 | NULL | false | UNKNOWN | false |
Prediction matches: true
Sources: null-comparison, null-where, null-logic, null-not-in
