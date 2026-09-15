# Development semantic review

**Codex-assisted semantic review. The reviewer authored this dataset; this is not independent human review or a learning-outcome study.**

Reviewed all 20 outputs in the completed first-10-case development probe. This covers only the database material, not the complete 40-case development split or any holdout output. The complete split remains unevaluated in this run.

The comparison is prior Qwen3:4b production configuration versus candidate Qwen3.5:4b local configuration. It uses the same material and questions but differs in weights and production configuration; it isolates neither citation review nor model weights. Exact identities and settings are in this run’s manifest.
Phrase flags and self-review verdicts do not determine correctness; the entries below record direct reading of final responses against their source. Withheld unverified outcomes receive no-answer, not refusal, treatment.

## Prefix probe metrics only

These are the predeclared metrics applied to this 10-case development probe only. They are not full-development, holdout, student-learning or contest scores.

| Variant | Strict correct | Accepted response | Unsupported accepted | Correct refusal | Language compliance | Median / p95 latency |
| --- | --- | --- | --- | --- | --- | --- |
| frozen-grounded | 3/10 | 9/10 | 5/9 | 0/3 | 9/9 | 4604.0 / 7616 ms |
| supported | 6/10 | 9/10 | 2/9 | 3/3 | 8/9 | 14060.0 / 37284 ms |

The baseline has one runtime error; the candidate has one unverified outcome. Neither is a correct refusal. Candidate dev-04 is semantically wrong because of an unsupported extra paragraph; its all-English answer is separately a product-language failure. Candidate dev-08 correctly gives UNKNOWN, but adds an unsupported necessity for all queries including missing rows; its qualified “not equal” wording is separately a pedagogical ambiguity. See JSON for per-claim reasoning and exact category, coverage, refusal, failure and latency breakdowns.

## Per-output rationale

| Case | Variant | Delivery | Correct | Rationale |
| --- | --- | --- | --- | --- |
| v13-dev-01 | frozen-grounded | delivered-answer | False | The accepted answer changes the comparison target from 12 to 1 and returns A/C. The actual table plus WHERE rule returns only B; the exact NOT IN quote concerns a different predicate and cannot support A/C. |
| v13-dev-01 | supported | unverified | False | The final application outcome is unverified and withholds any explanation; it is not a correct refusal. Both row data and NULL/WHERE rules were selected, so the question was answerable. A first draft gave the correct remaining code but used an ellipsis inside a purported exact quote; the retry withheld the answer. Rejected draft correctness does not count as delivery. |
| v13-dev-02 | frozen-grounded | delivered-answer | True | Both requested counts are present, 3 and 2, with an exact db-aggregates quote that states them. The Chinese response contains no extra claim. |
| v13-dev-02 | supported | delivered-answer | True | The complete requested pair COUNT(*) = 3 and COUNT(price) = 2 is stated correctly in Chinese. Exact quotes identify both counts and the three fixed rows; no extra unsupported facts are asserted. |
| v13-dev-03 | frozen-grounded | delivered-answer | True | The response gives exactly A+={A,B,C}; its quote includes the relation/dependencies and stated closure. No claim adds D. |
| v13-dev-03 | supported | delivered-answer | True | A+ = {A,B,C} and its derivation from A -> B -> C are correct; the exhaustive set excludes D. The extra candidate-key definition is unnecessary but is explicitly supported, and repeating the closure does not introduce a factual error. |
| v13-dev-04 | frozen-grounded | delivered-answer | True | The Chinese answer places right.active=1 in LEFT JOIN ON and excludes the later WHERE alternative. Its exact quote states both match restriction and retention of every left row. |
| v13-dev-04 | supported | delivered-answer | False | The first two paragraphs correctly put right.active = 1 in LEFT JOIN ON and explain why later WHERE removes unmatched rows. The final paragraph then says the source contains no information about the syntax or behavior of right/active, contradicting the explicit db-join predicate and behavior. Its db-rows quote cannot support that global absence claim. The answer is entirely English to a Chinese question; language mismatch is a separate product flag, not the reason for this semantic failure. |
| v13-dev-05 | frozen-grounded | delivered-refusal | False | The prose correctly says the engine version is unspecified and cites the scope. However, declared insufficient=false contradicts this refusal, so it fails the frozen strict rule despite semantically appropriate prose. |
| v13-dev-05 | supported | delivered-refusal | True | The final response says the selected passages cannot establish the answer and explicitly avoids treating absent evidence as falsity. No database engine or version is invented. This is an accepted insufficiency outcome, unlike unverified. |
| v13-dev-06 | frozen-grounded | delivered-refusal | False | Although it withholds the index identity, the response first asserts that an index is currently installed. The source describes no deployment or installed index, so the premise is invented; the refusal cannot earn correctness credit. |
| v13-dev-06 | supported | delivered-refusal | True | The Chinese response correctly withholds the unknown installed/fastest index and warns that missing information does not make a claim false. It does not repeat the earlier candidate's unsupported claim that there is no installed index. |
| v13-dev-07 | frozen-grounded | delivered-answer | False | The answer invents a 100% university exam grade. Its exact quote explicitly says no university examination policy is given, so the citation does not entail the claimed grade. |
| v13-dev-07 | supported | delivered-refusal | True | The accepted response correctly states source insufficiency rather than inventing an examination grade. The scope passage explicitly says no university examination policy is provided. |
| v13-dev-08 | frozen-grounded | delivered-answer | False | The first clause correctly says NULL=NULL is UNKNOWN, but then conflates UNKNOWN with inequality and claims IS NULL makes missing values equal in actual queries. Those added claims are not established and undermine the premise correction. |
| v13-dev-08 | supported | delivered-answer | False | The first paragraph correctly corrects NULL = NULL to UNKNOWN, not TRUE. Read in its explicit WHERE context, the middle paragraph's 'not equal' wording can mean 'does not match' and is flagged as pedagogically ambiguous rather than independently failing it. The final paragraph, however, turns a source example for including NULL while excluding price 12 into a general necessity: to include missing values one must use an explicit check such as that expression. The source establishes sufficiency for the stated combined goal, not a necessary form for all queries that include missing rows. The correct NULL comparisons do not substantiate this added requirement. |
| v13-dev-09 | frozen-grounded | delivered-answer | False | The main correction and arithmetic are right: 18 rather than 12, from 36/2 non-NULL values. The final sentence nevertheless changes the questioned value to '1:2'. Under the frozen rule against factual-number typos this is not a fully correct response; it is retained as a qualified main-result success, not silently repaired. |
| v13-dev-09 | supported | delivered-answer | True | All final claims are supported: the three prices are 12, 24 and NULL; NULL is missing rather than zero; AVG uses only non-NULL prices and equals 18, not 12. The correction directly rejects the requested false premise without changing the number or inventing a result. |
| v13-dev-10 | frozen-grounded | runtime-error | False | The pipeline ends with a 502 after two failed citation-validation attempts. No answer or refusal is delivered, so this is an error/no-answer and not a correct refusal. |
| v13-dev-10 | supported | delivered-refusal | False | The final response withholds a correction as if the source were insufficient. The selected db-fd passage states exactly the generating dependencies A -> B and B -> C and their implications; C+ contains only C, so C -> B is not implied. A complete answer should reject reversal of the arrow. This decision error invents no substantive index/number/policy fact and is recorded as unjustified refusal, not an unsupported substantive assertion. |
