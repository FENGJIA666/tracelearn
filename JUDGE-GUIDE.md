# Review TraceLearn

**Can a student test an explanation, rather than only read it?** TraceLearn connects a prediction, its original source, an editable counterexample and a fresh transfer question. The first complete course covers university database fundamentals.

## Start without installing a model

Download [TraceLearn-Portable.html](https://github.com/FENGJIA666/tracelearn/releases/download/v1.2.0/TraceLearn-Portable.html), under 0.5 MB. It contains the actual React workspace, 20 original questions, SQL/key experiments, source passages and exports. No Node.js, API key or model is needed for this route. The [README](README.md#try-the-portable-practice-first) explains the localhost static-preview fallback and the direct-file testing boundary.

Use the on-screen **Quick tour**, or follow these steps:

1. **Predict:** answer the SQL NULL question. To explore an intentional error, choose **200 and NULL** and **Very sure**, then inspect the **null-where** source.
2. **Experiment:** keep the initial rows 100, 200 and NULL. Predict that rows 2 and 3 survive `value <> 100`, then choose **Run & check prediction**. Row 3 is the counterexample: its predicate is UNKNOWN, so WHERE excludes it.
3. Change the condition to **value <> target OR value IS NULL**. Predict again and rerun; the missing row is now retained. Inputs and predicates are editable, and the computation makes no AI call.
4. **Transfer:** choose **Try a transfer question**. The app opens an unanswered attempt, even if an earlier result exists. Answer independently.
5. **Reflect & export:** export the Lab record with inputs, predictions and recomputed traces. The Notebook has a separate quiz/AI report and latest-attempt review suggestions. Lab predictions do not change quiz totals.

For the second experiment, choose **Keys & closure**. In the first schema, compare A, AD and ABD: A cannot reach D; AD is minimal; ABD contains removable B. The step trace and removal table show the calculation. The second schema explains why Instructor is not a superkey under the stated dependencies.

These are suggested software demonstration actions, not student-study results. No correct-answer count certifies mastery.

## Inspect live computation and recorded AI separately

The Lab computes from your current inputs. The **Evidence** tab displays the frozen 14 September model experiment. Its shortcuts show a supported answer, an outside-source refusal and a retained failure; all 80 cases and 160 requests remain available through the filters. Historical AI answers are explicitly labeled, and saved semantic judgments are agent-assisted, not independent human scoring.

Useful source entry points:

- [Deterministic SQL and key model](src/lab-model.ts) and [independent checking method](evidence/v1.2-lab-method.md).
- [Original course and questions](content/course.ts), [local answer pipeline](server/ai.ts) and [selected-passage practice planner](server/practice-planner.ts).
- [Technical report](submission/TraceLearn-Technical-Report.pdf), [current acceptance record](evidence/v1.2-acceptance.md) and [all frozen raw outputs](evaluation/raw-results.jsonl).

`npm test` passed 48 automated checks, including unit and HTTP integration tests. The SQL model was compared with real SQLite for 1,600 row results; the key model was checked for every subset of both fixed schemas using a different algorithm. These establish bounded implementation evidence, not educational effectiveness.

## Fresh local AI and your own notes

Install Node.js 22.13+ and Ollama, then run from the extracted project directory:

```sh
npm run setup
npm start
```

Open <http://127.0.0.1:4317>. Initial setup needs internet and approximately 3.2 GB of model downloads, plus dependencies. Tested on macOS / Apple M4 Pro / 24 GB memory; Windows and Linux were not tested. `Start-TraceLearn.command` is the Mac launcher after setup. It recognizes this installation and build, and selects another local port when a different or older instance is running.

Import `examples/revision-notes.md`, or a text PDF/Markdown/TXT of your own. Choose a passage in the source pane and **Generate from this passage**. The planner selects an unused eligible sentence, verifies exact reconstruction by the answer key, and preserves its citation and document hash. This is source-recall cloze practice, not an independently reviewed conceptual transfer test. Use **Ask the source** for a fresh model explanation; a matched quote does not guarantee correct reasoning.

## Interpret the old benchmark honestly

The 160-request experiment is unchanged from v1.0. On its 40-case holdout split, the full-source baseline and hybrid retrieval had 37/40 and 38/40 accepted outputs, 7/10 and 9/10 correct extracted MCQ keys, and median request times of 6.25 and 3.21 seconds. Both conditions used the same model, prompt and quote validator; only context selection differed.

Agent-assisted review judged 17/20 versus 18/20 source-answerable holdout responses fully correct. Accepted output is not semantic correctness. Incorrect explanations, refusals and validation failures remain visible, including an unsupported university-award claim. This small, author-created benchmark is not a blinded human evaluation or proof of improved grades.

The [v1.2.0 release](https://github.com/FENGJIA666/tracelearn/releases/tag/v1.2.0) supplies portable HTML, complete source/evidence ZIP, PDF and checksums. Dependencies, models and personal runtime databases are excluded. There is no hosted inference service or required live presentation. Read the [AI disclosure](submission/AI-DISCLOSURE.md) for the development contribution and its limits.
