# Controlled delayed-response browser verification

Executed on 15 September 2026 in a new Chrome tab via CUA, using the actual compiled TraceLearn 1.2 application at port 4340. Every API response in these checks was mocked. No Ollama inference, production SQLite, user study, or judging measurement was performed.

Seven checks passed:

| Check | Direct browser observation after the delayed response finished |
| --- | --- |
| Missing remembered course | The fixture seeded nonexistent course/question IDs; the app recovered to Database foundations and its 10 concept pairs / 20 passages. |
| Course A Ask → course B | B's new Ask completed independently; B's answer remained visible after A finished. No cancelled-request error or stuck busy indicator. |
| Delayed grade → another A question | The aggregate prompt remained ungraded and unselected; no NULL-question feedback attached to it. |
| Delayed grade → course B | B's BETA question and source remained visible, with no A feedback or alert. |
| Repeated A → B → A → B loads | After four delayed A question/history responses finished, B retained its one concept, BETA question, source passage, and empty history. |
| B generation → course A | A retained its original 10 concepts; the late generated B prompt did not appear or trigger navigation. |
| Fresh review | Notebook's SQL NULL review action opened an unanswered, unselected attempt; both previous mocked attempts remained in the notebook. |

The fixture logs independently showed `client-closed` before each delayed endpoint completed with `clientAlreadyClosed: true`. The Ask scenario also started and completed a new course B question before the old course A response finished. Browser console error/warning capture was empty.

`browser-results.json` contains the observed DOM values, request IDs, build/source hashes, and scope limitations. The four `trace-*.json` files retain endpoint timing and mocked history. The initial checks used the first dist build; the root rebuilt guide CSS before the later checks. The request-isolation logic was unchanged, and both observed index fingerprints are documented. If the relevant logic changes, rerun these cases.

The browser cannot deliver a fetch response after aborting its transport. This fixture therefore proves cancellation and surviving rendered state under real navigation; the separate four request-scope unit tests cover already-resolved callbacks that ignore transport abort.

See README.md for the controls and startup command. This folder packages the tested fixture and saved browser evidence. Only machine-local path metadata was redacted in the traces; the original measured artifact and source hashes are retained. Moving the fixture into this public folder and making its dist path independent of the working directory did not rerun the seven UI checks or create new screenshots.
