# Targeted thinking-mode development probe

Two previously examined development questions were run with Qwen3.5-4B, thinking enabled and a 4096-token cap under a 180-second whole-request deadline. Both reached the deadline without delivering an answer. These two failures support a latency decision only; they are not a comparative benchmark or a holdout result.

Configuration, source snapshots and available complete model responses are retained. A model call interrupted before returning has no complete HTTP response; its failure remains in the outer audit. The reproduction script uses an isolated TRACELEARN_DATA directory. The original invocation misspelled that isolation variable; its one synthetic course row was identified by the exact test signature, backed up locally, verified to have no attempts or chats, and removed. No user course or learning record was removed.
