# Curated question review

Reviewer: Codex development agent. Scope: every one of the 20 built-in questions and corresponding original source passages. This is an agent-assisted content review, not an independent teacher review or evidence of educational effectiveness. Correctness is determined by the fixed answer key, not by a generative model at grading time.

| Question | Key | Rationale and uniqueness check |
|---|---|---|
| null-d | A | Only 200 produces TRUE; 100 is FALSE and NULL is UNKNOWN. |
| null-t | C | Explicit IS NULL includes the missing row; comparison and its negation do not. |
| count-d | B | Three rows and two non-NULL values. |
| count-t | B | 30 divided by two non-NULL values gives 15. |
| notin-d | D | The predicate is FALSE for 1 and UNKNOWN for 2. |
| notin-t | C | TRUE AND UNKNOWN yields UNKNOWN. |
| key-d | C | SC determines SCG and is minimal; SCG is not minimal. |
| key-t | C | Minimality is set inclusion, not minimum cardinality. |
| fd-d | B | A same-X, different-Y pair is a direct counterexample. |
| fd-t | B | A finite sample without duplicates cannot prove the universal constraint. |
| closure-d | C | A reaches B then C but never D. |
| closure-t | C | AD reaches all attributes; neither proper one-attribute subset does. |
| 2nf-d | B | Under the stated SC key and non-prime Name, S -> Name is a partial dependency. |
| 2nf-t | B | A one-attribute set has no nonempty proper subset. Empty determinants are explicitly excluded to avoid an edge-case ambiguity. |
| bcnf-d | B | SC and SI are keys, all attributes prime; I is not a superkey. |
| bcnf-t | B | The prime-right-hand-side exception permits the dependency in 3NF, but not BCNF. |
| lossless-d | B | Intersection A determines component AB; sharing an attribute alone would not suffice. |
| lossless-t | B | Lossless join and dependency preservation are distinct properties. |
| join-d | B | The padded NULL gives UNKNOWN under the subsequent WHERE equality. |
| join-t | B | ON restricts right-side matches while retaining unmatched left rows. |

The SQL examples and selected candidate-key closures are also checked by executable tests. Transfer questions change the condition, representation or required inference, but are deliberately close to the taught concept. They are not a validated test of long-term transfer. Distractor-based feedback is a possible misconception suggestion, not a cognitive diagnosis.
