# Review TraceLearn

TraceLearn connects a concept check, its source evidence, targeted feedback and a transfer question. The first complete course covers university database fundamentals. All screenshots are from the implemented application.

## Start with the portable practice

Download [TraceLearn-Portable.html](https://github.com/FENGJIA666/tracelearn/releases/download/v1.1.0/TraceLearn-Portable.html), a single file under 0.5 MB. Open it in a browser. It contains actual curated practice, not a video or a sequence of simulated clicks. No model, Node.js or API key is needed for this route. Browser security settings may restrict local files; the [README](README.md#try-the-portable-practice-first) gives a localhost static preview fallback and explains our testing boundary.

1. In **SQL NULL**, select **200 and NULL** and **Very sure**. Check the deterministic feedback.
2. Click **null-where** to read the original source; complete the transfer check with **price <> 10 OR price IS NULL**.
3. Open **Notebook**. The latest confident mistake appears in the review plan; the button returns to its actual question. Export your real attempt record.
4. Open **Evidence**. Both saved answers to `in-4` are visible, including the hybrid answer's `10:00` typo and its qualified review. Filter **Development / Outside source / out-13** to see a retained unsupported university-award claim.

**The Evidence tab is a viewer of the 14 September run, not live inference.** It includes all 80 cases and 160 requests; failure records are retained. Use the full app below for fresh AI answers and your own documents.

## Inspect the implementation and experiment

Read the [eight-page technical report](submission/TraceLearn-Technical-Report.pdf), [original course](content/course.ts), [answer pipeline](server/ai.ts), [new acceptance evidence](evidence/v1.1-acceptance.md), and [frozen raw outputs](evaluation/raw-results.jsonl). The [v1.1.0 release](https://github.com/FENGJIA666/tracelearn/releases/tag/v1.1.0) includes portable HTML, complete source/evidence ZIP, PDF and checksums. Dependencies, models and personal runtime databases are excluded.

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
