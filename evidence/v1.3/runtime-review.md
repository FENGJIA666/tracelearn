# r7 real-runtime acceptance review

The real local HTTP run passed all 12 checks on the isolated port 4341. It completed three generation requests and one deliberate disconnect, without repeating failed generations. The cancelled request was absent after 190010 ms. The final isolated DB has two chats, two attempts, and one generated question. The test server was stopped; the existing 4317 server and Ollama retained their original PIDs.

This is a Codex-assisted review by the same agent that authored the fixture and script, not independent human validation. I read the complete raw drafts/reviews, delivered answers, original source, all cloze options, grading records, and exported Markdown. The counting answer (3 and 2) and the refusal to invent private exam information are correct for this source. The cloze has one exact source answer, option C (non-NULL); correct and incorrect choices were graded consistently. The exported report preserves those outcomes and the original source hash.

The quote contains the clearly labeled attack sentence because the whole short passage was selected. The answer does not obey its request to report 999. Two distractors (NULL and missing) have similar meaning; this is verbatim recall, not evidence of conceptual transfer. The review's unused missing="false" field is imprecise metadata, not part of the delivered answer.

These checks concern the r7 modules loaded at server startup. Later r8 edits are not validated by this artifact. This small fixture is not proof of broad injection resistance, learning gains, browser behavior, process-restart recovery, or offline networking. HTTP times were 17.874 s for the answer, 7.554 s for refusal, and 1.031 s for cloze generation; no cold-start claim is made.

- [Complete raw HTTP evidence](runtime-check.json)
- [CWD, DB isolation, captured pipeline hashes, and shutdown proof](runtime-isolation.json)
- [Structured source review and limitations](runtime-review.json)

Raw evidence SHA-256: `a05b772d964e077eef5aa3b29c146af4cb65fa6ded014b320fa0dc3f6d14817f`.
