# Request-isolation and launcher evidence

The seven checks in [browser-results.json](browser-results.json) used the actual compiled application in Chrome with a **mocked API** on port 4340. They test navigation, cancellation, stale results, missing-course recovery, and fresh review. They do not measure model quality or learning outcomes. [BROWSER-VERIFICATION.md](BROWSER-VERIFICATION.md) describes the observed states; the four `trace-*.json` files record request timing and fictional test-course history.

[The launcher record](../v1.2-launcher.json) is a separate **actual macOS launcher** experiment: two isolated installation copies, unchanged/changed build detection, server reuse, and process cleanup. It used shared dependencies, disabled browser opening, and made no inference requests. The 143 exit codes correspond to intentional launcher termination during cleanup; unchanged-instance reuse exited with 0. It does not establish Windows or Linux behavior.

## Reproduce the delayed UI checks

Install the project's locked dependencies and build the app, then start the fixture from the project root:

```sh
npm ci
npm run build
npx tsx evidence/v1.2-race/server.ts
```

The script resolves the project and `dist` relative to its own file, so an absolute script invocation also works from another working directory. It binds only to `127.0.0.1:4340`. Stop an earlier fixture on that port first; it does not replace or terminate another service.

Open [the fixture controls](http://127.0.0.1:4340/__fixture). Each mode delays its selected response by 6.5 seconds. Follow **Open actual application UI**, then use the application normally:

| Control | Action and expected result |
| --- | --- |
| Seed missing remembered course | The application should recover to Database foundations and its original question list. Only this fixture origin's browser preferences change. |
| Arm ask | Ask in A, switch to B, then ask in B before A finishes. B's answer must remain without an A answer, stray cancellation error, or busy state. |
| Arm grade | Answer in A, then select another A question or switch to B before completion. The new prompt must not acquire A's old feedback or highlighted answer. |
| Arm course-load | Perform A → B → A → B before delayed loads finish. B's questions, source, and history must remain B. |
| Arm generation | Generate in B, then switch to A before completion. A must not gain or jump to the late B question. |
| Arm none | From Notebook, open a previous wrong answer's review action. The new attempt should be unanswered while history remains. |

Mocked history stays in memory. The grade fixture commits an attempt before delaying its HTTP response, so an aborted response can legitimately leave an attempt in the originating course's history. The trace records client closure separately from the delayed backend completion. Unit tests in `tests/request-scope.test.ts` additionally cover already-resolved callbacks that transport cancellation cannot stop.

## Recorded evidence and redaction

These files preserve the original seven-check run; promotion into this folder did **not** rerun those UI cases or produce new screenshots. `browser-results.json` retains the original measured build/source fingerprints and the guide-CSS rebuild note. The published helper differs only in locating its project relative to its file and omitting machine-local absolute paths from metadata.

The four traces replace the machine's dist path with `<project>/dist`. No user documents, production history, credentials, or personal information are included. The launcher record already used installation labels A/B and contained no absolute installation paths; its results and fingerprints are unchanged. Numeric loopback ports are test routing evidence, not remote destinations. Temporary terminal logs and screenshots are omitted.
