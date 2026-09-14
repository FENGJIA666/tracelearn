# Review TraceLearn

TraceLearn connects a concept check, its source evidence, targeted feedback and a transfer question. The first complete course covers university database fundamentals. All screenshots are from the implemented application.

## Inspect without installing

1. Read the [seven-page technical and evaluation report](submission/TraceLearn-Technical-Report.pdf).
2. Inspect the [real learning workspace](submission/01-learning-workspace.png), [feedback](submission/02-misconception-evidence.png), [transfer check](submission/03-transfer-check.png) and [local AI response](submission/04-local-ai-citations.png).
3. Review [the original course and answer keys](content/course.ts), [retrieval and output checks](server/ai.ts), and [test evidence](evidence/acceptance.md).
4. Inspect the [frozen evaluation summary](evaluation/summary.json), [raw final outputs](evaluation/raw-results.jsonl) and [agent-assisted semantic review](evaluation/semantic-review.json). The review is not independent human scoring.

The [v1.0.0 release](https://github.com/FENGJIA666/tracelearn/releases/tag/v1.0.0) provides the complete source/evidence ZIP, the standalone PDF, and SHA-256 checksums. Model weights, dependencies and personal runtime databases are excluded from the download.

## Run on your computer

Tested environment: macOS, Apple M4 Pro, 24 GB memory. Windows and Linux were not tested. Install Node.js 22.13 or newer and Ollama from their official websites first. From the extracted project directory:

```sh
npm run setup
npm start
```

Open <http://127.0.0.1:4317>. Initial setup needs internet and approximately 3.2 GB of model downloads, plus dependencies. On the tested Mac, `Start-TraceLearn.command` is also provided after setup. The application runs locally; the download is not a hosted demo or a bundled standalone executable.

## Three-minute learning walkthrough, after setup

1. Choose **SQL NULL**, select **200 and NULL**, and mark **Very sure**. This is an intentional wrong answer to reveal the feedback path.
2. Inspect the feedback and open **null-where**. The source explains why WHERE retains only TRUE.
3. Open the transfer check and select **price <> 10 OR price IS NULL**.
4. Select **Explore this reasoning with local AI**, then **Ask the source**, and inspect its quoted passages.
5. Open **Notebook**, export the Markdown learning report, and refresh to confirm the local learning trail persists.

For your own source, import `examples/revision-notes.md`. Imported practice uses verified source-recall cloze exercises; it does not claim to generate independently reviewed conceptual transfer tests.

## Interpret the evidence

The final evaluation contains 80 original cases, each run with a full-source baseline and hybrid retrieval, for 160 requests. Both conditions use the same model, prompt and quote validator. On the 40-case holdout split, accepted outputs were 37/40 and 38/40, extracted MCQ keys were correct on 7/10 and 9/10, and median request times were 6.25 and 3.21 seconds, respectively.

Output validity and exact quotes do not prove semantic correctness. Incorrect answers and refusals remain in the results. Agent-assisted review found 17/20 versus 18/20 fully correct source-answerable holdout responses; no independently blinded human study, measured learning gain, or real-user adoption is claimed. Read the report's limitations and the [AI contribution disclosure](submission/AI-DISCLOSURE.md).
