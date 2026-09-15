# Release package gate

Run `python3 scripts/package-guard-check.py` from the project root with Python 3.11+. The [saved check](package-guard-check.json) records 16 passing tests of the fingerprinted script. All evaluation rows, judgments and files in these tests are synthetic; temporary directories are removed after each test. No model or real holdout contents are read. One small temporary ZIP is created to check every archived byte against its manifest.

The tests cover missing release authority, incomplete verification, changed frozen source, wrong file hashes, incomplete or duplicated case coverage, stale review identities, symlinks, credential/database filenames, and mutation during archive creation. Failure leaves an earlier archive and manifest unchanged. The recorded actual-project preflight stopped at the then-missing final manifest without opening real raw results; the public inventory count describes that earlier moment only.

`python3 scripts/package.py --check-only` is the later, read-only release check against the real completed evidence. It requires `verification.completed: true`, the matching frozen pipeline, 80 raw records and 80 corresponding saved reviews in each final split, and exact hashes/identities. `python3 scripts/package.py` creates the release only after those checks pass.

These tests do not establish that the final archive exists, extracts successfully, installs or launches. The final manifest and acceptance record document those later checks. A successful filename check also does not prove that arbitrary file contents contain no private information.
