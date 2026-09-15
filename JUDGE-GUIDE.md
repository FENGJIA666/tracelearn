# Review TraceLearn

**Can a student test an explanation?** TraceLearn connects a prediction, its source, an editable counterexample and a fresh transfer question. The first complete course covers university database fundamentals.

## Start without installing a model

Download [TraceLearn-Portable.html](https://github.com/FENGJIA666/tracelearn/releases/download/v1.3.0/TraceLearn-Portable.html). It contains the React workspace, 20 original questions, SQL/key experiments, source passages and exports. No Node.js, API key or model is needed for this route. The [README](README.md#try-the-portable-practice-first) explains local opening and the localhost static-preview fallback.

Use **Quick tour**, or follow this route:

1. **Predict:** answer the SQL NULL question. To explore an intentional error, choose **200 and NULL** and **Very sure**, then inspect **null-where**.
2. **Experiment:** keep rows 100, 200 and NULL. Predict that rows 2 and 3 survive `value <> 100`, then **Run & check prediction**. Row 3 is the counterexample: its predicate is UNKNOWN, so WHERE excludes it.
3. Change to **value <> target OR value IS NULL**, predict again and rerun. The missing row is retained. Inputs and predicates are editable; computation makes no model call.
4. **Transfer:** choose **Try a transfer question**. It matches the current condition or dependency schema and opens a fresh attempt without revealing an old answer. NOT IN has its own follow-up and source. Restarting Quick tour restores the initial experiment.
5. **Reflect & export:** export the Lab record with inputs, predictions and recomputed traces. **Notebook** separately reopens quiz attempts and saved AI answers, with their original citations and no new model call. Its learning-report export is separate from the Lab record.

For the second experiment, choose **Keys & closure**. Compare A, AD and ABD in the first schema: A cannot reach D; AD is minimal; ABD contains removable B. The second schema shows why Instructor is not a superkey, then leads to the matching 3NF/BCNF transfer question.

These are software demonstrations, not student-study results. Correct-answer counts do not certify mastery.

## Inspect the recorded comparison

The Lab computes from your current inputs. **Evidence** displays saved experiments without running a model. Select the v1.3 comparison or the original historical experiment. The new viewer defaults to holdout: choose a case, compare the frozen/current configurations, then expand citations and each request's own source snapshot. Failure filters retain incorrect answers and cases with no delivered explanation. Saved scores and rationales remain visible; `supported` is a model-check outcome, not a correctness score.

The [v1.3 final manifest](evidence/v1.3/final-manifest.json) is the authority for completed coverage, frozen configuration and raw hashes. The design is 80 cases across two configurations, totaling 160 requests with failures retained; a development directory alone does not establish completion. Development was used for tuning. The display projection checks raw-file hashes and copies saved reviews; it does not regrade them. The dataset-author Codex agent also performed the semantic scoring; this is neither blinded nor independent human review or evidence of learning gains.

Useful entry points:

- [SQL/key computation](src/lab-model.ts) and [independent algorithm checks](evidence/v1.2-lab-method.md).
- [Original course](content/course.ts), [current local-model configuration](server/local-model.ts), [answer/review pipeline](server/support-answer.ts) and [source-recall generator](server/source-recall.ts).
- [Technical report](submission/TraceLearn-Technical-Report.pdf), [v1.3 acceptance record](evidence/v1.3/acceptance.md) and [historical raw outputs](evaluation/raw-results.jsonl).

The Lab method compares 1,600 row results with real SQLite and all 24 attribute subsets of the fixed schemas with a different checking algorithm. The final acceptance record lists the completed automated and browser checks. These establish bounded implementation evidence, not educational effectiveness.

## Fresh local AI and your own notes

Install **Node.js 22.13+ and Ollama 0.34.0+**, then run:

```sh
npm run setup
npm start
```

Open <http://127.0.0.1:4317>. Setup checks the Ollama version before downloading `qwen3.5:9b` and `qwen3-embedding:0.6b`, approximately 7.234 GB combined, plus dependencies. Ollama 0.34.0+ is required for the tested chat `truncate:false` behavior. The validation host is macOS / Apple M4 Pro / 24 GB memory with Ollama 0.34.0; Windows/Linux are untested. Download size is not peak RAM usage. `Start-TraceLearn.command` recognizes its installation/build and chooses another local port when a different or older instance is running.

Use **Ask the source** for one concise conclusion with at most two program-extracted source excerpts. Code matches the quotes; a separate call to the same model reviews answerability, the conclusion and source attribution, and coverage of applicable conditions. The outcome is `supported`, `insufficient` or `unverified`, with at most two rounds/four chat calls and a 180-second deadline. Context is 16,384 tokens, output limit 1,800, `think:false`, `truncate:false`. No source is silently removed to fit context, and automatic review can still be wrong. Cancel stops the request without submitting another; saved answers reopen from Notebook after refresh with their original check status.

Import `examples/revision-notes.md` or a text PDF/Markdown/TXT. Select a passage and **Generate from this passage**. The source supplies the exact answer; the same new model proposes distractors. The planner avoids used sentences. A narrow check rejects competing SQL non-NULL aliases and permits at most one additional repair, for at most three generation calls. This is verbatim source recall, not conceptual transfer assessment; the original authored exercises provide the transfer route.

Only these two application models are required to use TraceLearn. To reproduce the frozen/current comparison, additionally run `ollama pull qwen3:4b` (approximately 2.5 GB) and follow the final manifest's configuration. That old model is an evaluation dependency, not a production requirement.

## Keep historical evidence in context

The original `evaluation/` experiment contains 80 cases and 160 requests under Qwen3-4B. It compares full-source and hybrid-retrieval contexts with the same old model, prompt and quote validator. Its results and errors remain unchanged, together with `server/ai.ts` and the original course. They are not v1.3 performance measurements. The new comparison changes the model and answer/review procedure; it is not a single-variable ablation. Neither experiment is a blinded human evaluation or proof of better grades.

The [v1.3.0 release entry](https://github.com/FENGJIA666/tracelearn/releases/tag/v1.3.0) is the download location for portable HTML, complete source/evidence ZIP, report and checksums. Models, dependencies and personal runtime databases are excluded from the source package. There is no hosted inference service or required live presentation. Read the [AI disclosure](submission/AI-DISCLOSURE.md) for the development contribution and limits.
