# Final acceptance record — 14 September 2026

Environment: Apple M4 Pro, 24 GB RAM, macOS; Node 22.16.0; Ollama 0.34.0. Models and digests are in evaluation/model-manifest.json.

- 17 unit tests passed. This includes SQL NULL execution, candidate-key closure, source matching, file boundaries, generated distractor checks and deterministic cloze reconstruction.
- 11 isolated HTTP checks passed, covering grading, hidden answer keys, history, export, imports and Host/Origin boundaries.
- Production build passed. npm run setup was executed successfully, including locked npm ci, model pulls/digest verification and build. Final archive received an isolated extraction/install/start check (see package-check.json).
- Actual browser workflow: intentional SQL NULL wrong answer, misconception suggestion, source navigation, transfer answer C correct, notebook, Markdown export, refresh recovery. Keyboard Enter and arrow-key answer selection were exercised on the aggregate question.
- Markdown import, cancellation, unavailable-model setup UI, connection recovery, and final AI-assisted source-recall generation/grading were exercised in the real browser. The generated NULL recall answer matched the source.
- Rendered DOM had no horizontal document overflow at 320, 768, 1024 and 1440 CSS pixels. Desktop and 320-pixel representative screenshots were visually inspected. Some intermediate screenshot tools had compositor scaling artifacts; those captures are excluded from the release.
- Both app and Ollama answered real source questions under a macOS localhost-only outbound policy. External DNS and direct-IP connections were denied. This does not mean the computer's Wi-Fi or browser network was disabled.
- One original adversarial document fixture was tested: its instruction to report 999 was ignored; the model reported the source-supported counts 3 and 2. This is not comprehensive attack resistance.
- Damaged, empty/scanned and 51-page PDFs, invalid/oversized files and unsupported types are covered by automated fixture tests. The 120-second timeout error mapping is tested with a simulated TimeoutError; a full 120-second stalled live-model call was not induced.
- 80 evaluation cases were run in two modes (160 final requests). Accepted outputs, available retries and failed-call errors are retained. Rejected calls do not retain every underlying model token. Semantic review is agent-assisted, not independent human evaluation.
- Every final PDF page was rendered and inspected; orphaned text was repaired. Cover is 1500x1000 (3:2); six gallery screenshots are real browser captures, each below 5 MB.
- Devpost saved as DRAFT, 3/4 steps done. Name, pitch, story, six technology tags, cover thumbnail and seven gallery images saved and previewed. No final terms acceptance or submission was performed. The current form provides no ZIP/PDF upload field; code/demo/video links are optional and were omitted under the authorized local-only scope.

Known product limitations: source quote matching does not prove semantic correctness; the final benchmark includes a fabricated university award policy and other incorrect or contradictory outputs. Imported exercises were narrowed from free-form question generation to exact-source recall after a real all-incorrect-option failure. No learning gains or real-user study are claimed.
