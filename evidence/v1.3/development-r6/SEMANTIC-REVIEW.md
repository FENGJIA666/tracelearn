# Development semantic review

**Codex-assisted semantic review. The reviewer authored this dataset; this is not independent human review or a learning-outcome study.**

Reviewed all 20 outputs in the completed first-10-case development probe. This covers only the database material, not the complete 40-case development split or any holdout output. The complete split remains unevaluated in this run.

The comparison is prior Qwen3:4b production configuration versus candidate Qwen3.5:9b local configuration. It uses the same material and questions but differs in weights and production configuration; it isolates neither citation review nor model weights. Exact identities and settings are in this run’s manifest.
Phrase flags and self-review verdicts do not determine correctness; the entries below record direct reading of final responses against their source. Withheld unverified outcomes receive no-answer, not refusal, treatment.

## Prefix probe metrics only

These are the predeclared metrics applied to this 10-case development probe only. They are not full-development, holdout, student-learning or contest scores.

| Variant | Strict correct | Accepted response | Unsupported accepted | Correct refusal | Language compliance | Median / p95 latency |
| --- | --- | --- | --- | --- | --- | --- |
| frozen-grounded | 3/10 | 9/10 | 5/9 | 0/3 | 9/9 | 5727.5 / 6778 ms |
| supported | 9/10 | 10/10 | 1/10 | 3/3 | 10/10 | 16478.5 / 22427 ms |

The baseline has one runtime error. The candidate delivers all ten responses. Its single failure is dev-08: the correct UNKNOWN correction is followed by an unsupported claim that IS NULL must be used to match missing values. The source gives a sufficient example, not a necessary form for every query. Dev-09 now supplies the correct average and count without the false NOT IN explanation, and dev-10 correctly rejects reversal using the quoted generating dependencies. See JSON for all rationales and the exact category, coverage, refusal, failure and latency breakdowns.

## Per-output rationale

| Case | Variant | Delivery | Correct | Rationale |
| --- | --- | --- | --- | --- |
| v13-dev-01 | frozen-grounded | delivered-answer | False | The accepted answer changes the comparison target from 12 to 1 and returns A/C. The actual table plus WHERE rule returns only B; the exact NOT IN quote concerns a different predicate and cannot support A/C. |
| v13-dev-01 | supported | delivered-answer | True | The single delivered conclusion identifies the complete remaining set B and explains each row: B/24 gives TRUE, A/12 gives FALSE, C/NULL gives UNKNOWN. Its actual two quotations provide all fixed rows and the TRUE-only WHERE/NULL comparison rules. The numerical comparisons are transparent consequences of the supplied values; no alternative filter or extra survivor is invented. |
| v13-dev-02 | frozen-grounded | delivered-answer | True | Both requested counts are present, 3 and 2, with an exact db-aggregates quote that states them. The Chinese response contains no extra claim. |
| v13-dev-02 | supported | delivered-answer | True | The complete requested counts are correct in Chinese, with an accurate three-row/two-non-NULL explanation. The single claim actually quotes both the aggregate passage and the fixed rows; these quotations directly support the values and their stated cause. |
| v13-dev-03 | frozen-grounded | delivered-answer | True | The response gives exactly A+={A,B,C}; its quote includes the relation/dependencies and stated closure. No claim adds D. |
| v13-dev-03 | supported | delivered-answer | True | The answer gives the exhaustive set {A,B,C} and the correct A -> B -> C derivation. Its actual db-fd quotation explicitly contains both generating dependencies, the licensed-addition rule and A+ = {A,B,C}. Repeating the resulting set within the sentence adds no unsupported fact. |
| v13-dev-04 | frozen-grounded | delivered-answer | True | The Chinese answer places right.active=1 in LEFT JOIN ON and excludes the later WHERE alternative. Its exact quote states both match restriction and retention of every left row. |
| v13-dev-04 | supported | delivered-answer | True | The single Chinese conclusion correctly places right.active = 1 in LEFT JOIN ON rather than WHERE, preserving every left row while matching only active right rows. Its actual db-join quotation explicitly states the predicate and both placement effects; the requested behavior is complete. |
| v13-dev-05 | frozen-grounded | delivered-refusal | False | The prose correctly says the engine version is unspecified and cites the scope. However, declared insufficient=false contradicts this refusal, so it fails the frozen strict rule despite semantically appropriate prose. |
| v13-dev-05 | supported | delivered-refusal | True | The final response says the selected passages cannot establish the answer and explicitly avoids treating absent evidence as falsity. No database engine or version is invented. This is an accepted insufficiency outcome, unlike unverified. |
| v13-dev-06 | frozen-grounded | delivered-refusal | False | Although it withholds the index identity, the response first asserts that an index is currently installed. The source describes no deployment or installed index, so the premise is invented; the refusal cannot earn correctness credit. |
| v13-dev-06 | supported | delivered-refusal | True | The Chinese response correctly withholds the unknown installed/fastest index and warns that missing information does not make a claim false. It does not repeat the earlier candidate's unsupported claim that there is no installed index. |
| v13-dev-07 | frozen-grounded | delivered-answer | False | The answer invents a 100% university exam grade. Its exact quote explicitly says no university examination policy is given, so the citation does not entail the claimed grade. |
| v13-dev-07 | supported | delivered-refusal | True | The accepted response correctly states source insufficiency rather than inventing an examination grade. The scope passage explicitly says no university examination policy is provided. |
| v13-dev-08 | frozen-grounded | delivered-answer | False | The first clause correctly says NULL=NULL is UNKNOWN, but then conflates UNKNOWN with inequality and claims IS NULL makes missing values equal in actual queries. Those added claims are not established and undermine the premise correction. |
| v13-dev-08 | supported | delivered-answer | False | The conclusion correctly corrects NULL = NULL to UNKNOWN rather than TRUE and says ordinary equality cannot treat the missing values as equal. It then asserts that matching missing values requires IS NULL. The actual db-null quote supplies a sufficient expression for including missing prices while excluding 12, not a universal necessary syntax for every query matching a missing value. This is the same unsupported sufficiency-to-necessity expansion rejected in r3; combining it into one claim does not make it grounded. |
| v13-dev-09 | frozen-grounded | delivered-answer | False | The main correction and arithmetic are right: 18 rather than 12, from 36/2 non-NULL values. The final sentence nevertheless changes the questioned value to '1:2'. Under the frozen rule against factual-number typos this is not a fully correct response; it is retained as a qualified main-result success, not silently repaired. |
| v13-dev-09 | supported | delivered-answer | True | The answer rejects the requested average 12 by giving 18 and the correct calculation basis SUM(price) = 36 and COUNT(price) = 2. It does not repeat the phrase NULL is ignored, but the stated count of two and the actual quoted non-NULL aggregate rule supply the decisive correction rather than a zero-filled three-row divisor. Both actual quotations support the values and missing-price context; no unrequested filter is appended. |
| v13-dev-10 | frozen-grounded | runtime-error | False | The pipeline ends with a 502 after two failed citation-validation attempts. No answer or refusal is delivered, so this is an error/no-answer and not a correct refusal. |
| v13-dev-10 | supported | delivered-answer | True | The delivered Chinese answer explicitly rejects B -> C implying C -> B and limits reasoning to the closure licensed by the generating set. The actual db-fd quotation states exactly A -> B, B -> C and their implications. A closure from C cannot add B, so the no-reversal result follows; no additional dependency or unknown-world assumption is needed. |
