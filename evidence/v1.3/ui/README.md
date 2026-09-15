# Version 1.3 browser evidence

- `learning-navigation.json`: compiled UI with an isolated real TraceLearn backend/SQLite; 14 source, question and Lab navigation checks. No model calls were needed.
- `acceptance.json`, `events.json`, `narrow-supported.jpg`: 10 actual Chrome UI checks with an explicitly mocked API. These verify rendering, keyboard/source navigation, cancellation, history and a 390px frame, not model correctness.
- The cancellation defect was reproduced twice before the fix: replacing the busy cancel button with a submit button during the click triggered an unwanted second request. Distinct React keys, preventing the click's default action, an explicit submit type and a busy guard removed that resubmission. The corrected event log records one request, cancellation and no response after the original delay.

The screenshot intentionally retains the MOCK label and is acceptance evidence only. It must not be uploaded as a live-model project screenshot. Final real-model screenshots and checks are recorded separately after the candidate is selected.
