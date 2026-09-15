# Development probes: preserved failures and revisions

These six synthetic questions were authored to reproduce known problems. They are development probes, not a holdout, not a representative accuracy benchmark, and not evidence of student learning gains.

- Frozen production baseline: all available returned outputs and errors are preserved. Failed candidate text was not exposed by the old function; those two errors have unknown internal causes.
- Candidate 1: exact quotations plus a second review call still accepted unsupported claims, a numeric typo, and an invalid dependency counterexample. This candidate was rejected.
- Candidate 2: thinking enabled, 4,096-token budget. Only the first two completed trials are recorded: 106.563 s and 161.494 s. The development process was interrupted during the next case because this configuration was too slow. This is an incomplete timing experiment, not a complete comparison.
- Candidate 3: short explicit basis before drafting, reason before review verdict, thinking disabled, 1,800-token budget. Five answerable probes produced correct final answers. The missing-schema probe remained unverified because the reviewer invented a claim index for an empty draft.
- Candidate 4: the review JSON schema requires exactly the draft's number of claims. The missing-schema probe then returned an explicit insufficient-source outcome in 5.139 s. The other five were not needlessly rerun for this structural fix.

Candidate 3's source snapshot is included. Earlier exploratory candidates were not fully source-snapshotted and should not be presented as fully reproducible benchmark runs. The separate full development and holdout runner captures configurations, dependency hashes, source snapshots, and raw model HTTP outputs for the formal comparison. All correctness statements here are Codex-assisted reasoning, not independent human review.
