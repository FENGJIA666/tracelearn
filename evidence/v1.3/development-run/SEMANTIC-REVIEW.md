# Development semantic review

**Codex-assisted semantic review. The reviewer authored this dataset; this is not independent human review or a learning-outcome study.**

Reviewed 18 of 80 planned outputs. Raw completed rows available: 18. **Partial run stopped for pre-freeze code changes; not a 40-case-per-variant score.**

The comparison covers complete previous and proposed production configurations. It does not isolate the causal contribution of one review stage.
Phrase flags and self-review verdicts do not determine correctness; the entries below record direct reading of final responses against their source. Withheld unverified outcomes receive no-answer, not refusal, treatment.

## Per-output rationale

| Case | Variant | Delivery | Correct | Rationale |
| --- | --- | --- | --- | --- |
| v13-dev-01 | frozen-grounded | delivered-answer | False | The accepted answer changes the comparison target from 12 to 1 and returns A/C. The actual table plus WHERE rule returns only B; the exact NOT IN quote concerns a different predicate and cannot support A/C. |
| v13-dev-01 | supported | delivered-answer | True | The delivered answer identifies B and correctly states 24 <> 12 is TRUE. The cited row data and selected NULL/WHERE rules support the result; no unsupported extra claim is added. |
| v13-dev-02 | frozen-grounded | delivered-answer | True | Both requested counts are present, 3 and 2, with an exact db-aggregates quote that states them. The Chinese response contains no extra claim. |
| v13-dev-02 | supported | unverified | False | The application withheld an answer as unverified even though db-aggregates explicitly supplies both counts. This is no-answer, not a correct refusal or a wrong numeric answer. |
| v13-dev-03 | frozen-grounded | delivered-answer | True | The response gives exactly A+={A,B,C}; its quote includes the relation/dependencies and stated closure. No claim adds D. |
| v13-dev-03 | supported | unverified | False | The final output is unverified and delivers no closure. db-fd was selected and explicitly answers the question, so this is no-answer rather than a justified refusal. |
| v13-dev-04 | frozen-grounded | delivered-answer | True | The Chinese answer places right.active=1 in LEFT JOIN ON and excludes the later WHERE alternative. Its exact quote states both match restriction and retention of every left row. |
| v13-dev-04 | supported | unverified | False | The requested ON-versus-WHERE answer is present in selected db-join, but the final application result is unverified. No substantive answer was delivered. |
| v13-dev-05 | frozen-grounded | delivered-refusal | False | The prose correctly says the engine version is unspecified and cites the scope. However, declared insufficient=false contradicts this refusal, so it fails the frozen strict rule despite semantically appropriate prose. |
| v13-dev-05 | supported | delivered-refusal | True | The accepted response clearly declines because the source cannot establish the requested engine/version. It does not invent a version or treat absent evidence as falsity; insufficient=true matches the prose. |
| v13-dev-06 | frozen-grounded | delivered-refusal | False | Although it withholds the index identity, the response first asserts that an index is currently installed. The source describes no deployment or installed index, so the premise is invented; the refusal cannot earn correctness credit. |
| v13-dev-06 | supported | delivered-refusal | True | The Chinese refusal states the sources cannot establish the answer and avoids asserting an installed index or performance recommendation. This is appropriate given the explicit index/timing omissions. |
| v13-dev-07 | frozen-grounded | delivered-answer | False | The answer invents a 100% university exam grade. Its exact quote explicitly says no university examination policy is given, so the citation does not entail the claimed grade. |
| v13-dev-07 | supported | delivered-refusal | True | The application refuses to supply a university grade because the source does not establish it. No grade or policy is fabricated and insufficient=true is consistent with the prose. |
| v13-dev-08 | frozen-grounded | delivered-answer | False | The first clause correctly says NULL=NULL is UNKNOWN, but then conflates UNKNOWN with inequality and claims IS NULL makes missing values equal in actual queries. Those added claims are not established and undermine the premise correction. |
| v13-dev-08 | supported | unverified | False | The source explicitly corrects the NULL=NULL premise, but the application returns unverified rather than that correction. This is no-answer, not a successful refusal. |
| v13-dev-09 | frozen-grounded | delivered-answer | False | The main correction and arithmetic are right: 18 rather than 12, from 36/2 non-NULL values. The final sentence nevertheless changes the questioned value to '1:2'. Under the frozen rule against factual-number typos this is not a fully correct response; it is retained as a qualified main-result success, not silently repaired. |
| v13-dev-09 | supported | unverified | False | The actual source contains the complete numeric correction, but the final application result is unverified. No answer was accepted; it receives no correct-refusal credit. |
