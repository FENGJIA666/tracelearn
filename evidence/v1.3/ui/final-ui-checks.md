# Final UI acceptance — CurrentEvidence and portable practice

Observed in isolated Google Chrome tabs through the CUA extension, using the final compiled app on port 4345 and the rebuilt portable HTML on port 4329. These are actual UI checks, not mocked model outputs. No AI request was submitted and no score was changed.

| Check | Observed result |
| --- | --- |
| Final holdout totals | Frozen 18/40, current 34/40; not delivered 15 and 1. Built-in source panel and its toggle are absent in current Evidence. |
| Development and filtering | Frozen 20/40, current 38/40; not delivered 10 and 1. Correct/failed/missing filters leave each split’s aggregate scores unchanged. |
| Answer and saved review | Both configurations show their actual final answer or error and saved rationale. The retained holdout-05 failure visibly shows outcome supported, taskCorrect false, and invalid evidence. |
| Record-specific source | A current dev-01 citation expands its own db-rows snapshot with the exact saved quote. All five saved input passages are available; no built-in passage is substituted. |
| Keyboard | Enter and Space operate native evidence details. Type-ahead h + Enter switches Development to Holdout; select and summary display a 3px focus outline. |
| Narrow layout and language | At 390×844, Chinese and English document widths remain 390px, controls fit, comparison becomes one column, and the non-independent-scoring notice is visible. |
| Historical navigation | Original experiment restores source panel and toggle. The in-4 citation opens null-where and focuses its heading. Returning to Practice or Ask restores the source panel. Ask was not submitted. |
| Portable practice | Fresh HTML reload, confident incorrect NULL answer, deterministic feedback and source jump all work. Portable Evidence matches final holdout totals. |
| Portable Lab and transfer | Edited row value 250; NULL-inclusive predicate keeps 250 and NULL. NOT IN (100, NULL) excludes all rows. Its transfer opens fresh with no selected answer, and UNKNOWN grades correct. |
| Export and refresh | Actual 1,498-byte Lab and 1,031-byte learning Markdown downloads match the two experiments and two practice attempts. Reload preserves notebook totals and both Lab records. |

All 10 scoped checks passed. The browser download-event observer timed out for the Lab export, but the newly created downloaded file was independently found, inspected, and copied unchanged; this was an observation-tool limitation, not a missing download.

The portable HTML was 922,680 bytes. Full observations and SHA-256 fingerprints are in [final-ui-checks.json](final-ui-checks.json). The main final screenshot is [14-current-evidence.jpg](../../../submission/14-current-evidence.jpg); the local evidence copy and six supporting screenshots are alongside this note. Real exported practice records are [the Lab report](TraceLearn-lab-record.md) and [the learning report](TraceLearn-portable-learning-report.md). These are scripted acceptance attempts, not learner-study results.

Temporary Chrome viewport overrides were reset. No unrelated browser tabs, the main port-4317 app, or Devpost were used. Live inference and submission are verified separately by the root task.
