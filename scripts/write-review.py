"""Recount saved Codex review judgments; does not perform independent scoring."""
from pathlib import Path
import json
p=Path(__file__).resolve().parent.parent/'evaluation/semantic-review.json'
j=json.loads(p.read_text())
assert len(j['items'])==40 and len(j['unanswerableReview']['items'])==40
for mode in ['baseline','grounded']:
 rows=[r for r in j['items'] if r['mode']==mode]
 j['counts'][mode]={'fullyCorrect':sum(r['answerVerdict']=='correct' for r in rows),'total':len(rows),'fullMainClaimSupport':sum(r['citationSupport']=='supports_main_claim' for r in rows)}
p.write_text(json.dumps(j,indent=2))
print(j['counts'])
