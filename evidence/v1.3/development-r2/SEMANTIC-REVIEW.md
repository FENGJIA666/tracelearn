# Development semantic review

**Codex-assisted semantic review. The reviewer authored this dataset; this is not independent human review or a learning-outcome study.**

Reviewed all 20 outputs from the first 10 development cases. **This is a completed prefix probe, not the full 40-case development split.**

The comparison covers complete previous and proposed production configurations. It does not isolate the causal contribution of one review stage.
Phrase flags and self-review verdicts do not determine correctness; the entries below record direct reading of final responses against their source. Withheld unverified outcomes receive no-answer, not refusal, treatment.

## Per-output rationale

| Case | Variant | Delivery | Correct | Rationale |
| --- | --- | --- | --- | --- |
| v13-dev-01 | frozen-grounded | delivered-answer | False | The accepted answer changes the comparison target from 12 to 1 and returns A/C. The actual table plus WHERE rule returns only B; the exact NOT IN quote concerns a different predicate and cannot support A/C. |
| v13-dev-01 | supported | delivered-answer | False | The accepted result incorrectly includes C by inserting OR price IS NULL, which the question did not contain. It also says price=12 evaluates FALSE; that equality is TRUE for A. These are material predicate and truth-value errors despite exact quotes and the model's support label. |
| v13-dev-02 | frozen-grounded | delivered-answer | True | Both requested counts are present, 3 and 2, with an exact db-aggregates quote that states them. The Chinese response contains no extra claim. |
| v13-dev-02 | supported | delivered-answer | True | All three delivered claims agree: COUNT(*)=3, COUNT(price)=2, and exactly two of the three rows have non-NULL price. The cited aggregates and rows support every part. |
| v13-dev-03 | frozen-grounded | delivered-answer | True | The response gives exactly A+={A,B,C}; its quote includes the relation/dependencies and stated closure. No claim adds D. |
| v13-dev-03 | supported | delivered-answer | True | The closure and exclusion of D are correct under the given dependencies. The extra AD candidate-key fact is also stated in selected db-fd; its irrelevance to the requested A closure is explanatory, not an unsupported factual addition. |
| v13-dev-04 | frozen-grounded | delivered-answer | True | The Chinese answer places right.active=1 in LEFT JOIN ON and excludes the later WHERE alternative. Its exact quote states both match restriction and retention of every left row. |
| v13-dev-04 | supported | unverified | False | The final output is unverified although selected db-join states the complete ON-clause answer. Rejected drafts are withheld, so this is no-answer, not a correct refusal. |
| v13-dev-05 | frozen-grounded | delivered-refusal | False | The prose correctly says the engine version is unspecified and cites the scope. However, declared insufficient=false contradicts this refusal, so it fails the frozen strict rule despite semantically appropriate prose. |
| v13-dev-05 | supported | delivered-refusal | True | The accepted refusal does not invent an engine version and correctly treats missing evidence as insufficient rather than false. Its structured flag matches the refusal. |
| v13-dev-06 | frozen-grounded | delivered-refusal | False | Although it withholds the index identity, the response first asserts that an index is currently installed. The source describes no deployment or installed index, so the premise is invented; the refusal cannot earn correctness credit. |
| v13-dev-06 | supported | delivered-answer | False | The answer states that no index is currently installed. db-scope says installed-index information is unstated, not that the index set is empty. This is the exact missing-evidence-to-negative-assertion failure the protocol prohibits. |
| v13-dev-07 | frozen-grounded | delivered-answer | False | The answer invents a 100% university exam grade. Its exact quote explicitly says no university examination policy is given, so the citation does not entail the claimed grade. |
| v13-dev-07 | supported | delivered-refusal | True | The response declines to infer a university grade from subject notes, adds no grade or policy, and sets insufficient=true consistently. |
| v13-dev-08 | frozen-grounded | delivered-answer | False | The first clause correctly says NULL=NULL is UNKNOWN, but then conflates UNKNOWN with inequality and claims IS NULL makes missing values equal in actual queries. Those added claims are not established and undermine the premise correction. |
| v13-dev-08 | supported | delivered-answer | True | The answer repeatedly and explicitly corrects NULL=NULL to UNKNOWN rather than TRUE. Its 'not treated as equal' wording is qualified by UNKNOWN, not an assertion that comparison yields FALSE; the C-versus-A illustration is consistent with NULL equality failing the WHERE TRUE test. |
| v13-dev-09 | frozen-grounded | delivered-answer | False | The main correction and arithmetic are right: 18 rather than 12, from 36/2 non-NULL values. The final sentence nevertheless changes the questioned value to '1:2'. Under the frozen rule against factual-number typos this is not a fully correct response; it is retained as a qualified main-result success, not silently repaired. |
| v13-dev-09 | supported | delivered-answer | True | All clauses correctly reject zero-filling NULL and give the complete 36/2=18 calculation. The numeric facts and non-NULL denominator are directly cited; no number or premise is altered. |
| v13-dev-10 | frozen-grounded | runtime-error | False | The pipeline ends with a 502 after two failed citation-validation attempts. No answer or refusal is delivered, so this is an error/no-answer and not a correct refusal. |
| v13-dev-10 | supported | delivered-refusal | False | The source gives the complete generating dependency set and closure method, so it supports correcting the claim that B->C implies C->B. Refusing because evidence is incomplete misses this answerable false premise. |
