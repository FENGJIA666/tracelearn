# r8 real context-boundary check

Three checks passed: isolated-store/model preflight, one long-source support request, and one oversized-input rejection. The support request used the production r8 prompts, schemas and local model adapter with fixed retrieval inputs: five original Chinese passages of 1,400 UTF-16 characters each. It returned the correct first and final codes, NOVA-Q7 and MAPLE-T9, with exact source excerpts, in two calls and 43.224 seconds. Ollama reported 4,935 and 5,001 prompt tokens.

The single 40,000-character request was rejected by Ollama with HTTP 400: 24,031 prompt tokens exceeded the configured 16,384-token context. The production adapter returned an actionable AppError with status 400. Its complete nested error response is retained. No request was repeated.

This is Codex-assisted review by the same agent that authored the fixture, not independent human validation. The delivered code answer is correct. The automated review inaccurately calls the two citations full-page texts; they are exact 486- and 52-character excerpts that contain the required codes. That wording is not evidence of perfect reviewer reasoning.

Fixed retrieval means this does not test keyword/vector search. The repetitive 7,000-character source is below the model token limit; it is not a capacity benchmark at that limit, a tokenizer worst case, or proof that all middle content was understood.

- [Original fixture, configuration hashes, full HTTP requests/responses, and checks](context-check.json)
- [Structured Codex review and limitations](context-review.json)
- [Reproducible fixture and runner](../../scripts/context-check-v13.ts)

Raw artifact SHA-256: `9f42aad918fd265858c54852718b1ed980ab13b995ec1bbff96b47afd8513a8a`.
